#!/usr/bin/env python3
"""Phase 1 extraction (batch) — create code files exactly as given in each
generated-code/*.md, preserving the folder structure the markdown specifies.

Folder structure is taken from the "Project Structure" tree in the .md when present
(both the indented "- file / /dir" style and the "|-- / \\--" glyph style), and from
inline `path` hints / section context otherwise. Extracts ONLY what the .md contains;
does NOT synthesize files the model did not emit.

Run from repo root:  python3 scripts/extract_all.py
"""
import os, re, sys, glob, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, "generated-code")

FENCE = re.compile(r'^([ \t]*)```([A-Za-z0-9+#.\-]*)\s*$')
BT    = re.compile(r'`([^`\n]+)`')
DOTFILES = {'.env', '.gitignore', '.dockerignore'}
SPECIAL  = {'dockerfile': 'Dockerfile', 'docker-compose.yml': 'docker-compose.yml',
            'docker-compose.yaml': 'docker-compose.yml'}
DIRWORDS = {'src','components','services','controllers','models','routes','config',
            'middleware','backend','frontend','client','server','public','utils','api'}

def has_ext(tok):
    base = tok.rstrip('/').split('/')[-1]
    return bool(re.search(r'\.\w+$', base)) and base not in DOTFILES or base in DOTFILES

def is_pathlike(tok):
    tok = tok.strip()
    if tok in DOTFILES or tok.lower() in SPECIAL: return True
    if ' ' in tok or len(tok) > 120: return False
    return bool(re.match(r'^\.?[\w-]+(?:/[\w.\-]+)*\.\w+$', tok))

def norm(p):
    p = p.strip().replace('\\', '/')
    while p.startswith('./'): p = p[2:]
    return SPECIAL.get(p.lower(), p)

# ---------- structure-tree parsing ----------
def find_structure_block(lines):
    """Return (start,end) line indices of the structure tree fenced block, or None."""
    for i,l in enumerate(lines):
        if re.search(r'(project|directory|folder)\s+structure', l, re.I):
            # next fenced block
            for j in range(i, min(i+6, len(lines))):
                m=FENCE.match(lines[j])
                if m:
                    for k in range(j+1, len(lines)):
                        if lines[k].strip()=='```': return (j+1,k)
            # heading matched but block not right after; keep looking
    # fallback: a very-early fenced block that looks like a tree
    for j,l in enumerate(lines[:40]):
        if FENCE.match(l):
            for k in range(j+1, len(lines)):
                if lines[k].strip()=='```': break
            seg=lines[j+1:k]
            treeish=sum(1 for s in seg if re.search(r'(^|\s)(/\w|[-├└│]|\w+/)', s))
            if seg and treeish>=max(3,len(seg)//2): return (j+1,k)
            return None
    return None

def parse_tree(seg):
    """Parse tree lines into a set of relative file paths (root segment stripped)."""
    paths=[]; stack=[]  # stack of (indent, dirname)
    for raw in seg:
        if not raw.strip(): continue
        conv = raw.replace('\t','    ')
        conv = re.sub(r'[│├└]', ' ', conv).replace('─',' ')
        indent = len(conv) - len(conv.lstrip(' '))
        name = conv.strip()
        name = re.sub(r'^[-*]\s*', '', name).strip()   # drop bullet
        name = name.split('#')[0].strip()              # drop trailing comments
        if not name: continue
        is_dir = name.startswith('/') or name.endswith('/') or \
                 (not re.search(r'\.\w+$', name) and name.rstrip('/').split('/')[-1] not in DOTFILES)
        clean = name.strip('/').split('/')[-1] if '/' in name else name.strip('/')
        clean = clean.rstrip('/')
        # pop deeper/equal
        while stack and stack[-1][0] >= indent: stack.pop()
        if is_dir:
            stack.append((indent, clean))
        else:
            parts=[d for _,d in stack] + [clean]
            paths.append('/'.join(parts))
    # strip a common root dir (myapp, fullstack-app, project, app...)
    if paths:
        firsts={p.split('/')[0] for p in paths}
        if len(firsts)==1:
            root=firsts.pop()
            if root.lower() in {'myapp','fullstack-app','project','app','root','src'} or \
               all('/' in p for p in paths):
                paths=[p[len(root)+1:] for p in paths if p.startswith(root+'/')] or paths
    return [norm(p) for p in paths]

# ---------- block path resolution ----------
def path_from_blockhead(code):
    for ln in code.split('\n')[:3]:
        s = ln.strip()
        m = re.match(r'^(?://|#|--|/\*|<!--)\s*(?:File:|file:|path:)?\s*([^\s*]+)', s)
        if m and is_pathlike(m.group(1)):
            lines=code.split('\n')
            if lines[0].strip()==s: lines=lines[1:]
            return norm(m.group(1)), '\n'.join(lines)
    return None, code

def guess(code, lang):
    c=code.lstrip()
    if lang=='json' or c.startswith('{'):
        if '"dependencies"' in code or '"scripts"' in code or '"name"' in code: return 'package.json'
    if lang=='sql' or re.search(r'create\s+table|create\s+database', code, re.I): return 'schema.sql'
    if re.search(r'^\s*[A-Z][A-Z0-9_]*\s*=', code, re.M) and re.search(r'SECRET|DATABASE|PORT|PASSWORD|JWT', code) \
       and 'require(' not in code and len(code.splitlines())<15: return '.env'
    if lang in ('yaml','yml') and 'services:' in code: return 'docker-compose.yml'
    return None

def section_family(text):
    m=None
    for kw,fam in [('/client','front'),('/frontend','front'),('/server','back'),('/backend','back'),
                   ('frontend','front'),('client','front'),('backend','back'),('server','back')]:
        idx=text.lower().rfind(kw)
        if idx>-1 and (m is None or idx>m[0]): m=(idx,fam)
    return m[1] if m else None

def extract(md):
    name=os.path.basename(md)[:-3]
    outdir=os.path.join(SRC, name+"_files")
    lines=open(md,encoding='utf-8',errors='replace').read().split('\n')
    tb=find_structure_block(lines)
    tree_paths=parse_tree(lines[tb[0]:tb[1]]) if tb else []
    tmap={}
    for p in tree_paths: tmap.setdefault(p.split('/')[-1], []).append(p)

    # collect code blocks (skip the structure block)
    recent=None; i=0; blocks=[]
    while i<len(lines):
        m=FENCE.match(lines[i])
        if not m:
            toks=[t for t in BT.findall(lines[i]) if is_pathlike(t)]
            if toks: recent=norm(toks[-1])
            i+=1; continue
        if tb and i==tb[0]-1:   # the structure fence itself
            i=tb[1]+1; recent=None; continue
        indent,lang=m.group(1),m.group(2).lower()
        body=[]; i+=1
        while i<len(lines) and not (FENCE.match(lines[i]) and lines[i].strip()=='```'):
            body.append(lines[i][len(indent):] if lines[i].startswith(indent) else lines[i]); i+=1
        prose_before='\n'.join(lines[max(0,i-60):i])   # for section context
        i+=1
        blocks.append((recent,lang,'\n'.join(body),prose_before)); recent=None

    written={}
    for hint,lang,code,prose in blocks:
        if not code.strip(): continue
        p,code2=path_from_blockhead(code)
        p=p or hint or guess(code,lang)
        if not p: continue
        p=norm(p)
        base=p.split('/')[-1]
        # if we have a tree, prefer the tree's full path for this file
        if tmap.get(base):
            cands=tmap[base]
            if '/' in p and p in tree_paths:
                pass  # explicit path already matches tree
            elif len(cands)==1:
                p=cands[0]
            else:
                fam=section_family(prose)
                pick=None
                for c in cands:
                    top=c.split('/')[0]
                    if fam=='front' and top in {'client','frontend'}: pick=c
                    if fam=='back' and top in {'server','backend'}: pick=c
                p=pick or (p if '/' in p else cands[0])
        if p in written and len(code2)<=len(written[p]): continue
        written[p]=code2

    if os.path.isdir(outdir):
        try: shutil.rmtree(outdir)
        except PermissionError:
            print(f"   (could not clear {os.path.basename(outdir)} — needs delete permission; overwriting in place)")
    os.makedirs(outdir, exist_ok=True)
    for p,code in written.items():
        fp=os.path.join(outdir,p); os.makedirs(os.path.dirname(fp) or outdir, exist_ok=True)
        open(fp,'w',encoding='utf-8').write(code.rstrip()+'\n')
    return name, sorted(written.keys()), bool(tree_paths)

def main():
    for md in sorted(glob.glob(os.path.join(SRC,"*.md"))):
        name,files,used_tree=extract(md)
        print(f"\n### {name}_files  ({len(files)} files){'  [structure tree used]' if used_tree else ''}")
        for f in files: print("   ",f)
    print("\nDone -> generated-code/*_files/")

if __name__=="__main__":
    main()
