"""Proposal-only local patch runner. Worktree isolation is NOT a sandbox."""
import argparse,hashlib,json,os,re,subprocess,tempfile
from pathlib import Path
PROFILES={"python-unit":["python","-m","unittest","discover","-s","tests","-v"]}
def command(argv,cwd,timeout=90,check=True):
    return subprocess.run(argv,cwd=cwd,capture_output=True,text=True,timeout=timeout,check=check,env={"PATH":os.environ.get("PATH","")})
def execute(repo,handoff,patch,profile="python-unit"):
    repo=Path(repo).resolve();patch=Path(patch).resolve()
    plan=json.loads(Path(handoff).read_text(encoding="utf8"))
    if not re.fullmatch(r"repair-[a-f0-9]{20}",plan.get("task_id","")):raise ValueError("bad task id")
    if plan.get("permission")!="PROPOSE_PATCH_ONLY" or plan.get("approval_required") is not True or any(plan.get(k) is not False for k in ("auto_execute","auto_merge","auto_deploy")):raise ValueError("unauthorized")
    if profile not in PROFILES:raise ValueError("unapproved test profile")
    if not patch.is_file() or patch.stat().st_size>128000:raise ValueError("invalid patch")
    raw=patch.read_bytes()
    if b"\x00" in raw or not raw.startswith(b"diff --git a/"):raise ValueError("invalid git patch")
    for line in raw.splitlines():
        if line.startswith((b"diff --git ",b"--- ",b"+++ ",b"rename from ",b"rename to ")) and (b"../" in line or b"..\\" in line):raise ValueError("path traversal")
        if line.startswith((b"GIT binary patch",b"Binary files ",b"Submodule ")):raise ValueError("binary patch")
    if command(["git","status","--porcelain"],repo).stdout.strip():raise ValueError("dirty source checkout")
    rev=command(["git","rev-parse","HEAD"],repo).stdout.strip()
    with tempfile.TemporaryDirectory(prefix="repair-worktree-") as temp:
        worktree=Path(temp)/"tree"
        command(["git","worktree","add","--detach",str(worktree),rev],repo)
        try:
            if command(["git","apply","--check",str(patch)],worktree,check=False).returncode:raise ValueError("patch does not apply")
            command(["git","apply","--",str(patch)],worktree)
            changed=command(["git","diff","--name-only"],worktree).stdout.splitlines()
            if not changed:raise ValueError("empty change")
            result=command(PROFILES[profile],worktree,check=False)
            return {"task_id":plan["task_id"],"base_commit":rev,"patch_sha256":hashlib.sha256(raw).hexdigest(),"changed_paths":changed,"tests_passed":result.returncode==0,"test_exit_code":result.returncode,"test_excerpt":(result.stdout+result.stderr)[-3000:],"review_required":True,"auto_merge":False,"auto_deploy":False}
        finally:command(["git","worktree","remove","--force",str(worktree)],repo,check=False)
def main():
    p=argparse.ArgumentParser()
    for arg in ("repo","handoff","patch","output"):p.add_argument("--"+arg,required=True)
    args=p.parse_args();r=execute(args.repo,args.handoff,args.patch)
    Path(args.output).write_text(json.dumps(r,indent=2)+"\n",encoding="utf8")
    if not r["tests_passed"]:raise SystemExit(1)
if __name__=="__main__":main()
