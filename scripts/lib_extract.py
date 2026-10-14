"""
Robust extraction of a multi-file project from a raw LLM response (.md).

Order of reliability:
  1. JSON manifest  {"files":[{"path","content"}, ...]}  -- what the output contract requests.
  2. Markdown fences with an explicit path (fence info string, preceding bold/File: line,
     or a leading path comment inside the block).
  3. Tree-aware resolution: when a block's name has no folder (e.g. **Register.js**), use the
     "Project Structure" tree in the .md (if any) to recover the full path.
  4. Content sniffing: unnamed blocks that are clearly package.json / index.html / schema.sql / .env.

LLM content is written VERBATIM. Nothing is synthesised here (that is lib_scaffold's job, logged).
"""
from __future__ import annotations
import json, re
from pathlib import Path

_BAD = ("..", "~")
DOTFILES = {".env", ".gitignore", ".dockerignore"}
SPECIAL = {"dockerfile": "Dockerfile", "docker-compose.yml": "docker-compose.yml",
           "docker-compose.yaml": "docker-compose.yml"}


def safe_relpath(p: str) -> str | None:
    p = (p or "").strip().strip('"').strip("'").replace("\\", "/")
    p = re.sub(r"^[\s`*:]+|[\s`*:]+$", "", p)        # strip md emphasis / stray colons+backticks
    p = re.sub(r"^\./", "", p).lstrip("/")
    low = p.lower()
    if low in SPECIAL:
        return SPECIAL[low]
    if not p or any(seg in _BAD for seg in p.split("/")):
        return None
    if re.search(r"[:*?<>|]", p):
        return None
    return p


_PATHISH = re.compile(r"^[\w.\-/]+\.[A-Za-z0-9]+$")
def looks_like_path(tok: str) -> bool:
    tok = (tok or "").strip().strip("`*#:").strip().replace("\\", "/")
    return bool(_PATHISH.match(tok)) or tok in DOTFILES or tok.lower() in SPECIAL


# ---------- 1. JSON manifest ----------
def json_manifest(text: str) -> dict[str, str] | None:
    dec = json.JSONDecoder()
    for i, ch in enumerate(text):
        if ch != "{":
            continue
        try:
            obj, _ = dec.raw_decode(text, i)
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict) and isinstance(obj.get("files"), list):
            out: dict[str, str] = {}
            for f in obj["files"]:
                if isinstance(f, dict) and "content" in f:
                    sp = safe_relpath(str(f.get("path", "")))
                    if sp:
                        out[sp] = f["content"] if isinstance(f["content"], str) \
                            else json.dumps(f["content"], indent=2)
            if out:
                return out
    return None


def salvage_json_files(text: str) -> dict[str, str]:
    """Recover every complete {"path","content"} object, even if the surrounding
    manifest is truncated (model hit max_tokens mid-array). Each object parses on
    its own, so a cut-off tail just drops the last, incomplete file."""
    dec = json.JSONDecoder()
    out: dict[str, str] = {}
    i, n = 0, len(text)
    while i < n:
        j = text.find("{", i)
        if j < 0:
            break
        try:
            obj, end = dec.raw_decode(text, j)
        except json.JSONDecodeError:
            i = j + 1
            continue
        if isinstance(obj, dict) and "path" in obj and "content" in obj:
            sp = safe_relpath(str(obj["path"]))
            if sp:
                out[sp] = obj["content"] if isinstance(obj["content"], str) \
                    else json.dumps(obj["content"], indent=2)
        i = end
    return out


# ---------- structure-tree parsing (for the markdown fallback) ----------
_FENCE = re.compile(r"^([ \t]*)```([A-Za-z0-9+#.\-]*)\s*$")

def _find_tree(lines: list[str]) -> list[str]:
    seg = None
    for i, l in enumerate(lines):
        if re.search(r"(project|directory|folder)\s+structure", l, re.I):
            for j in range(i, min(i + 6, len(lines))):
                if _FENCE.match(lines[j]):
                    for k in range(j + 1, len(lines)):
                        if lines[k].strip() == "```":
                            seg = lines[j + 1:k]; break
                    break
            if seg:
                break
    if not seg:
        return []
    paths, stack = [], []
    for raw in seg:
        if not raw.strip():
            continue
        conv = raw.replace("\t", "    ")
        conv = re.sub(r"[│├└]", " ", conv).replace("─", " ")
        indent = len(conv) - len(conv.lstrip(" "))
        name = re.sub(r"^[-*]\s*", "", conv.strip()).split("#")[0].strip()
        if not name:
            continue
        is_dir = name.endswith("/") or (not re.search(r"\.\w+$", name)
                                        and name.rstrip("/").split("/")[-1] not in DOTFILES)
        clean = name.strip("/").split("/")[-1]
        while stack and stack[-1][0] >= indent:
            stack.pop()
        if is_dir:
            stack.append((indent, clean))
        else:
            paths.append("/".join([d for _, d in stack] + [clean]))
    # strip a single common root dir (fullstack-app/, myapp/, ...)
    firsts = {p.split("/")[0] for p in paths}
    if len(firsts) == 1:
        root = firsts.pop()
        if root.lower() in {"myapp", "fullstack-app", "project", "app", "root"}:
            paths = [p[len(root) + 1:] for p in paths if p.startswith(root + "/")] or paths
    return [safe_relpath(p) for p in paths if safe_relpath(p)]


_BT = re.compile(r"`([^`\n]+)`")
_LEAD = re.compile(r"^\s*(?://|#|--|/\*|<!--)\s*(?:File:|file:|path:)?\s*([\w.\-/]+\.[A-Za-z0-9]+)")

def _name_from_info(info: str) -> str | None:
    m = re.search(r'(?:title|file|name)\s*=\s*["\']?([\w.\-/]+)["\']?', info)
    if m and looks_like_path(m.group(1)):
        return m.group(1)
    for tok in info.split():
        if looks_like_path(tok):
            return tok
    return None

def _name_from_preceding(pre_lines: list[str]) -> str | None:
    for line in reversed([l for l in pre_lines if l.strip()][-3:]):
        cand = re.sub(r"^(File|Path)\s*:\s*", "",
                      line.strip().strip("*#").strip().strip("`").strip(), flags=re.I).strip()
        if looks_like_path(cand):
            return cand
        toks = [t for t in _BT.findall(line) if looks_like_path(t)]
        if toks:
            return toks[-1]
    return None

def _sniff(body: str, lang: str) -> str | None:
    b = body.lstrip()
    if lang == "json" or b.startswith("{"):
        if '"dependencies"' in body or '"scripts"' in body:
            return "package.json"
    if "<!doctype html" in b.lower() or 'id="root"' in body:
        return "public/index.html"
    if lang == "sql" or re.search(r"create\s+table|create\s+database", body, re.I):
        return "schema.sql"
    if (re.search(r"^\s*[A-Z][A-Z0-9_]*\s*=", body, re.M)
            and re.search(r"SECRET|DATABASE|PORT|PASSWORD|JWT", body)
            and "require(" not in body and len(body.splitlines()) < 15):
        return ".env"
    return None


def markdown_fallback(text: str) -> tuple[dict[str, str], list[str]]:
    lines = text.split("\n")
    tree = _find_tree(lines)
    by_base: dict[str, list[str]] = {}
    for p in tree:
        by_base.setdefault(p.split("/")[-1], []).append(p)

    files, warnings = {}, []
    i, unnamed = 0, 0
    while i < len(lines):
        m = _FENCE.match(lines[i])
        if not m:
            i += 1; continue
        indent, lang = m.group(1), m.group(2).lower()
        pre = lines[max(0, i - 4):i]
        body = []
        i += 1
        while i < len(lines) and lines[i].strip() != "```":
            body.append(lines[i][len(indent):] if lines[i].startswith(indent) else lines[i])
            i += 1
        i += 1
        code = "\n".join(body)
        if not code.strip() or lang in ("bash", "sh", "text", ""):
            # skip shell/install snippets unless they clearly name a file
            name = _name_from_preceding(pre)
            if not name:
                continue
        else:
            name = _name_from_info(lang + " " + "") or _name_from_preceding(pre)
            lead = _LEAD.match(body[0]) if body else None
            if not name and lead:
                name = lead.group(1)
            if not name:
                name = _sniff(code, lang)
        if not name:
            unnamed += 1
            warnings.append(f"unnamed block #{unnamed} skipped ({lang}, {len(code)} chars)")
            continue
        sp = safe_relpath(name)
        if not sp:
            warnings.append(f"rejected path {name!r}"); continue
        # tree-aware: if no folder but the tree knows this basename, use the tree path
        if "/" not in sp and by_base.get(sp):
            cands = by_base[sp]
            sp = cands[0] if len(cands) == 1 else cands[0]
        if sp in files and len(code) <= len(files[sp]):
            continue
        files[sp] = code
    return files, warnings


# ---------- public API ----------
def extract_files(raw: str) -> tuple[dict[str, str], dict]:
    report = {"method": None, "n_files": 0, "warnings": [], "paths": []}
    files = json_manifest(raw)
    if files:
        report["method"] = "json_manifest"
    else:
        md_files, warnings = markdown_fallback(raw)
        salvaged = salvage_json_files(raw)          # handles truncated manifests
        if len(salvaged) >= len(md_files):
            files, report["method"] = salvaged, "json_salvage"
            if salvaged:
                warnings.append("recovered %d file(s) from a truncated/invalid JSON manifest "
                                "(the last file may be incomplete — consider raising max_tokens)"
                                % len(salvaged))
        else:
            files, report["method"] = md_files, "markdown_fallback"
        report["warnings"] = warnings
    report["n_files"] = len(files)
    report["paths"] = sorted(files)
    return files, report


def write_files(files: dict[str, str], out_dir) -> None:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)          # always create the dir, even for 0 files
    for path, content in files.items():
        dest = out / path
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(content.rstrip() + "\n", encoding="utf-8")


def extract_to_dir(raw: str, out_dir) -> dict:
    files, report = extract_files(raw)
    write_files(files, out_dir)
    return report


if __name__ == "__main__":
    import sys
    raw = Path(sys.argv[1]).read_text(encoding="utf-8", errors="replace")
    out = sys.argv[2] if len(sys.argv) > 2 else sys.argv[1].replace(".md", "_files")
    rep = extract_to_dir(raw, out)
    print(f"[extract] {rep['method']} files={rep['n_files']} -> {out}")
    for w in rep["warnings"]:
        print("   warn:", w)
