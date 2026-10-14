"""Read-only engineering issue triage: untrusted data never grants authority."""
import argparse,hashlib,json,re
from pathlib import Path
PROTECTED=("auth/","security/","policy/","supabase/migrations/","db/migrations/",".github/workflows/")
SENSITIVE=("/auth/","/security/","/payments/","/ledger/","/secrets/")
SECRET=re.compile(r"(?i)(bearer\s+\S+|(?:api[_-]?key|token|password|secret)\s*[:=]\s*\S+)")
def scrub(value):
    return SECRET.sub("[REDACTED]",str(value))[:1200]
def classify_paths(paths):
    if not isinstance(paths,list) or len(paths)>1000: raise ValueError("invalid paths")
    clean=[];high=False
    for p in paths:
        if not isinstance(p,str) or not p or len(p)>500 or "\x00" in p: raise ValueError("invalid path")
        p=p.replace(chr(92),"/")
        if p.startswith("/") or re.match(r"^[A-Za-z]:",p) or any(s in (".","..","") for s in p.split("/")): raise ValueError("unsafe path")
        clean.append(p)
        high=high or p.startswith(PROTECTED) or any(s in ("/"+p) for s in SENSITIVE) or p in ("package-lock.json","pyproject.toml")
    return clean,high
def make_plan(event):
    if not isinstance(event,dict) or event.get("schema_version")!=1: raise ValueError("invalid event schema")
    if event.get("kind") not in ("ci_failure","bug","security_finding"): raise ValueError("unsupported event")
    paths,high=classify_paths(event.get("paths",[]))
    high=high or not paths or event["kind"]=="security_finding"
    title=scrub(event.get("title","Untitled issue"));evidence=scrub(event.get("evidence",""))
    if not title.strip() or not evidence.strip(): raise ValueError("title and evidence required")
    stable=json.dumps([event["kind"],sorted(paths),title,evidence],separators=(",",":"),ensure_ascii=True)
    ident=hashlib.sha256(stable.encode()).hexdigest()[:20]
    return {"schema_version":1,"issue_fingerprint":ident,"status":"INVESTIGATION_REQUIRED",
            "risk":"HIGH_REVIEW_REQUIRED" if high else "NORMAL_REVIEW_REQUIRED","title":title,
            "paths":paths,"evidence_excerpt":evidence,
            "actions":["Reproduce in trusted environment","Propose minimal patch and regression test",
                       "Run full baseline and security checks" if high else "Run baseline and change-aware checks",
                       "Open draft PR for human review"],
            "auto_merge":False,"auto_deploy":False,"commands_executed":0,
            "knowledge_promotion":"ONLY_AFTER_VERIFIED_FIX_AND_INDEPENDENT_APPROVAL"}
def main():
    parser=argparse.ArgumentParser();parser.add_argument("--input",required=True);parser.add_argument("--output",required=True)
    args=parser.parse_args();src=Path(args.input)
    if src.stat().st_size>128*1024: raise ValueError("input too large")
    result=make_plan(json.loads(src.read_text(encoding="utf-8")))
    Path(args.output).write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
if __name__=="__main__":main()
