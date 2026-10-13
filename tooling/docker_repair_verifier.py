"""Manual Docker-isolated verification of an approved patch; no agent or deploy."""
import argparse,hashlib,json,os,subprocess,tempfile
from pathlib import Path
from repair_worktree_runner import command
from repair_handoff import handoff

IMAGE="python:3.12.7-slim-bookworm"
IMAGE_DIGEST_ENV="REPAIR_DOCKER_IMAGE_DIGEST"
def docker_args(worktree,image):
    if not image.startswith("python@sha256:") or len(image)!=len("python@sha256:")+64 or any(c not in "0123456789abcdef" for c in image.split(":")[-1]):
        raise ValueError("pin image by digest using python@sha256:<64 lowercase hex>")
    return ["docker","run","--rm","--network","none","--read-only",
      "--cap-drop","ALL","--security-opt","no-new-privileges","--pids-limit","64",
      "--memory","512m","--memory-swap","512m","--cpus","1","--user","65534:65534",
      "--tmpfs","/tmp:rw,noexec,nosuid,size=64m,mode=1777",
      "--mount",f"type=bind,src={worktree},dst=/workspace,readonly",
      "--workdir","/workspace","--env","PYTHONDONTWRITEBYTECODE=1",
      image,"python","-B","-m","unittest","discover","-s","tests","-v"]
def execute(repo,plan_path,patch_path,image,runner=subprocess.run):
    repo=Path(repo).resolve();patch=Path(patch_path).resolve()
    plan=json.loads(Path(plan_path).read_text(encoding="utf-8"))
    # Re-check all handoff invariants: do not trust the JSON handoff.
    handoff({"schema_version":1,"issue_fingerprint":plan.get("task_id","")[7:],
      "status":"INVESTIGATION_REQUIRED","risk":plan.get("risk"),"paths":plan.get("paths_for_investigation",[]),
      "title":"validated handoff","evidence_excerpt":"validation",
      "auto_merge":plan.get("auto_merge"),"auto_deploy":plan.get("auto_deploy"),"commands_executed":0})
    if plan.get("permission")!="PROPOSE_PATCH_ONLY" or plan.get("approval_required") is not True or any(plan.get(k) is not False for k in ("auto_execute","auto_merge","auto_deploy")):
        raise ValueError("handoff not authorized")
    if not patch.is_file() or patch.stat().st_size>128000: raise ValueError("invalid patch")
    raw=patch.read_bytes()
    if not raw.startswith(b"diff --git a/") or b"\x00" in raw: raise ValueError("invalid patch framing")
    if command(["git","status","--porcelain"],repo).stdout.strip(): raise ValueError("dirty checkout")
    rev=command(["git","rev-parse","HEAD"],repo).stdout.strip()
    with tempfile.TemporaryDirectory(prefix="repair-docker-") as temp:
        tree=Path(temp)/"tree"
        command(["git","worktree","add","--detach",str(tree),rev],repo)
        try:
            check=command(["git","apply","--check","--",str(patch)],tree,check=False)
            if check.returncode: raise ValueError("patch does not apply")
            # Prevent symlink, binary and submodule changes and filename surprises before applying.
            info=command(["git","apply","--numstat","--",str(patch)],tree).stdout
            if not info.strip() or "\t-\t" in info or "\n-\t" in info: raise ValueError("nontext or empty patch")
            for line in raw.splitlines():
                if line.startswith((b"new file mode ",b"old mode ",b"new mode ",b"deleted file mode ",b"rename ",b"copy ",b"GIT binary patch",b"Binary files ")):
                    raise ValueError("unsupported patch operation")
            command(["git","apply","--",str(patch)],tree)
            changed=command(["git","diff","--name-only"],tree).stdout.splitlines()
            if not changed: raise ValueError("no modified files")
            # No host tests; only code mounted readonly in a restricted container.
            cmd=docker_args(tree,image)
            result=runner(cmd,capture_output=True,text=True,timeout=120,check=False)
            return {"task_id":plan["task_id"],"base_commit":rev,"patch_sha256":hashlib.sha256(raw).hexdigest(),
              "changed_paths":changed,"container_image":image,"tests_passed":result.returncode==0,
              "test_exit_code":result.returncode,"test_excerpt":(result.stdout+result.stderr)[-2000:],
              "review_required":True,"auto_merge":False,"auto_deploy":False}
        finally:
            command(["git","worktree","remove","--force",str(tree)],repo,check=False)
def main():
    p=argparse.ArgumentParser()
    for a in ("repo","handoff","patch","output"):p.add_argument("--"+a,required=True)
    a=p.parse_args();image=os.environ.get(IMAGE_DIGEST_ENV,"")
    result=execute(a.repo,a.handoff,a.patch,image)
    Path(a.output).write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
    if not result["tests_passed"]:raise SystemExit(1)
if __name__=="__main__":main()
