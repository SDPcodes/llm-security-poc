"""
Scaffold / "doctor" an extracted app so it builds and runs, and draft its contract.json.

INTEGRITY: never edits a model-produced file. Only ADDS missing boilerplate, each addition
logged (tier: 'harness' = non-source like index.html/.env; 'entry' = React entry/package.json,
source-adjacent and flagged). Missing build scripts / undeclared deps are FLAGGED, not fixed,
so an incomplete generation is recorded as a functional-correctness finding (proposal §3.6.1).

Also writes contract.json (EXECUTION_GUIDE §5) by introspecting the backend routes, with
_needs_review=true so you confirm the 2-3 fields a static scan can't be sure of.
"""
from __future__ import annotations
import json, re
from pathlib import Path

INDEX_HTML = """<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>{title}</title></head>
  <body><noscript>You need to enable JavaScript to run this app.</noscript>
  <div id="root"></div></body>
</html>
"""

ENV_TEMPLATE = """# Injected by scaffold to match the sandbox DB (EXECUTION_GUIDE §4). Edit as needed.
PORT=5000
DATABASE_URL=postgresql://pocuser:pocpass123@localhost:5432/pocdb
PGHOST=localhost
PGPORT=5432
PGUSER=pocuser
PGPASSWORD=pocpass123
PGDATABASE=pocdb
JWT_SECRET=test-secret-for-poc-only
"""

FRONTEND_PKG = {
    "name": "frontend", "version": "0.1.0", "private": True,
    "dependencies": {"react": "^18.2.0", "react-dom": "^18.2.0",
                     "react-scripts": "5.0.1", "axios": "^1.6.0",
                     "react-router-dom": "^6.20.0"},
    "scripts": {"start": "react-scripts start", "build": "react-scripts build"},
    "browserslist": {"production": [">0.2%", "not dead"], "development": ["last 1 chrome version"]},
}

ENTRY_V18 = """import React from 'react';
import {{ createRoot }} from 'react-dom/client';
import App from '{imp}';
createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
"""

NODE_BUILTINS = {"fs","path","http","https","crypto","os","url","util","stream","events","buffer",
                 "child_process","net","zlib","querystring","assert","dns","tls","process","console"}


def _find_dir(app: Path, markers) -> Path | None:
    """Find the dir (app or a subdir) that contains any of the marker relative files."""
    for base in [app] + [d for d in app.iterdir() if d.is_dir()]:
        for m in markers:
            if (base / m).exists():
                return base
    return None


def _scan_imports(root: Path) -> set[str]:
    specs, pat = set(), re.compile(r"""(?:from\s*|require\(\s*)['"]([^'".][^'"]*)['"]""")
    for f in root.rglob("*"):
        if f.suffix.lower() in (".js", ".jsx", ".ts", ".tsx") and "node_modules" not in f.parts:
            try:
                for s in pat.findall(f.read_text(encoding="utf-8", errors="ignore")):
                    if s.startswith("."):
                        continue
                    top = "/".join(s.split("/")[:2]) if s.startswith("@") else s.split("/")[0]
                    if top not in NODE_BUILTINS:
                        specs.add(top)
            except Exception:
                pass
    return specs


_AUTH = {"register": {"path": "/register", "body": ["username", "email", "password"]},
         "login": {"path": "/login", "body": ["email", "password"], "token_field": "token"}}

def _draft_contract(backend: Path | None, task: str = "a07") -> dict:
    """Best-effort, task-aware contract draft (EXECUTION_GUIDE §5). _needs_review=True:
    confirm the 2-3 route/field guesses a static scan can't be certain of before Phase 5."""
    c = {"task": task, "port": 5000, "api_base": "/api", "auth_header": "raw", "_needs_review": True}
    # task-specific skeletons (defaults; adjusted from code below where possible)
    if task in ("a01", "a07", "cross"):
        c["auth"] = json.loads(json.dumps(_AUTH))
    if task == "a07":
        c["a07"] = {"profile": {"path": "/profile", "update_fields": ["username", "email"],
                                "id_from": "token"}}
        # legacy flat keys so old-style a07 consumers keep working
        c["register"], c["login"] = c["auth"]["register"], c["auth"]["login"]
        c["profile"] = c["a07"]["profile"]
    elif task == "a01":
        c["a01"] = {"resource": {"list": "/projects", "item": "/projects/{id}",
                                 "create": "/projects", "create_body": ["name"],
                                 "delete": "/projects/{id}", "id_field": "id",
                                 "admin_only_delete": True}}
    elif task == "a03":
        c["a03"] = {"search": {"path": "/products", "param": "q"},
                    "contact": {"path": "/contact", "body": ["name", "email", "message"]}}
    elif task == "a10":
        c["a10"] = {"preview": {"path": "/preview", "field": "url"}}
        c.pop("auth_header", None); c["auth_header"] = "none"
    elif task == "cross":
        c["cross"] = {"upload": {"path": "/files", "field": "file"}, "list": "/files",
                      "download": "/files/{id}/download", "id_field": "id"}

    if not backend:
        return c
    code = "\n".join(f.read_text(encoding="utf-8", errors="ignore")
                     for f in backend.rglob("*.js") if "node_modules" not in f.parts)
    if not re.search(r"['\"]/api", code):
        c["api_base"] = ""
    m = re.search(r"listen\(\s*(?:process\.env\.PORT\s*\|\|\s*)?(\d{2,5})", code)
    if m:
        c["port"] = int(m.group(1))
    # cookie auth detection (httpOnly cookie apps, common in security-instructed arm)
    cookie_auth = bool(re.search(r"res\.cookie\(|cookie-parser|httpOnly", code, re.I)) and \
        not re.search(r"authorization", code, re.I)
    if "auth" in c:
        if re.search(r"\baccessToken\b", code):
            c["auth"]["login"]["token_field"] = "accessToken"
        if cookie_auth:
            c["auth_header"] = "cookie"
        elif re.search(r"Bearer\s|replace\(['\"]Bearer|startsWith\(['\"]Bearer", code, re.I):
            c["auth_header"] = "bearer"
    if task == "a07" and re.search(r"/profile/:\w*id", code):
        c["a07"]["profile"]["id_from"] = c["profile"]["id_from"] = "url"
    return c


def doctor(app_dir, title="App", task="a07") -> dict:
    app = Path(app_dir)
    rep = {"injected": [], "flags": [], "missing_dependencies": {}, "contract_written": False}
    if not app.is_dir() or not any(app.rglob("*")):
        rep["flags"].append("no extracted files — extraction produced nothing for this sample")
        return rep

    def add(path, content, tier, reason):
        dest = app / path
        if dest.exists():
            return
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(content if isinstance(content, str) else json.dumps(content, indent=2),
                        encoding="utf-8")
        rep["injected"].append({"path": path, "tier": tier, "reason": reason})

    frontend = _find_dir(app, ["src/App.js", "src/App.jsx", "public/index.html", "package.json"])
    backend = _find_dir(app, ["server.js", "backend/server.js", "index.js", "app.js"])
    # prefer a backend dir distinct from frontend
    if backend and frontend and backend == frontend:
        for d in app.iterdir():
            if d.is_dir() and d != frontend and any((d / m).exists() for m in ("server.js", "index.js", "app.js")):
                backend = d; break
    rel = lambda p: str(p.relative_to(app)) if p and p != app else "."
    rep["frontend_dir"], rep["backend_dir"] = rel(frontend), rel(backend)

    if frontend:
        fr = frontend.relative_to(app)
        if not (frontend / "public" / "index.html").exists():
            add(str(fr / "public/index.html"), INDEX_HTML.format(title=title),
                "harness", "CRA needs public/index.html with <div id='root'>; model omitted it")
        app_file = next((n for n in ("src/App.js", "src/App.jsx", "src/App.tsx")
                         if (frontend / n).exists()), None)
        entry = next((n for n in ("src/index.js", "src/index.jsx", "src/index.tsx")
                      if (frontend / n).exists()), None)
        if not entry and app_file:
            imp = "./" + re.sub(r"^src/", "", app_file).rsplit(".", 1)[0]
            add(str(fr / "src/index.js"), ENTRY_V18.format(imp=imp),
                "entry", f"React entry missing; standard mount of {imp} injected")
        if not (frontend / "package.json").exists():
            add(str(fr / "package.json"), FRONTEND_PKG,
                "entry", "frontend package.json missing; standard CRA manifest injected")
    else:
        rep["flags"].append("no frontend detected (no src/App.* or package.json)")

    if backend:
        br = backend.relative_to(app)
        envdir = br if br != Path(".") else Path(".")
        if not (backend / ".env").exists() and not (app / ".env").exists():
            add(str(envdir / ".env"), ENV_TEMPLATE, "harness", "DB/port config supplied for sandbox")
    else:
        rep["flags"].append("no backend detected (no server.js/index.js/app.js)")

    # dependency + build-script flags (NOT auto-fixed)
    for label, root in (("frontend", frontend), ("backend", backend)):
        if not root:
            continue
        pkgp = root / "package.json"
        deps = {}
        if pkgp.exists():
            try:
                pkg = json.loads(pkgp.read_text(encoding="utf-8"))
                deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
                if "build" not in pkg.get("scripts", {}) and label == "frontend":
                    rep["flags"].append("frontend package.json has no build script")
            except Exception as e:
                rep["flags"].append(f"{label} package.json invalid JSON: {e}")
        missing = sorted(s for s in _scan_imports(root) if s not in deps)
        if missing:
            rep["missing_dependencies"][label] = missing

    # contract.json
    contract = _draft_contract(backend, task)
    (app / "contract.json").write_text(json.dumps(contract, indent=2))
    rep["contract_written"] = True

    (app / "scaffold_report.json").write_text(json.dumps(rep, indent=2))
    return rep


if __name__ == "__main__":
    import sys
    r = doctor(sys.argv[1], title=sys.argv[2] if len(sys.argv) > 2 else "App",
               task=sys.argv[3] if len(sys.argv) > 3 else Path(sys.argv[1]).name.split("_")[0])
    print(f"[scaffold] fe={r['frontend_dir']} be={r['backend_dir']} "
          f"injected={len(r['injected'])} flags={len(r['flags'])} "
          f"missing_deps={sum(len(v) for v in r['missing_dependencies'].values())}")
    for i in r["injected"]:
        print(f"   + {i['path']} ({i['tier']})")
    for f in r["flags"]:
        print(f"   ! {f}")
