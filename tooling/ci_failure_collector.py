"""Normalize GitHub Actions failed-job metadata into an untrusted triage event."""
import json,sys
from pathlib import Path
from repair_triage import make_plan

def collect(payload):
    if not isinstance(payload,dict) or payload.get("conclusion")!="failure":
        raise ValueError("not a failed workflow")
    jobs=payload.get("jobs")
    if not isinstance(jobs,list) or len(jobs)>200:
        raise ValueError("invalid jobs")
    failed=[]
    for job in jobs:
        if not isinstance(job,dict):
            raise ValueError("invalid job")
        if job.get("conclusion")=="failure":
            failed.append({"job":str(job.get("name","unknown"))[:100],
                           "steps":[str(s.get("name","unknown"))[:100] for s in job.get("steps",[])
                                    if isinstance(s,dict) and s.get("conclusion")=="failure"][:20]})
    if not failed:
        raise ValueError("no failed jobs")
    url=payload.get("html_url","")
    if not isinstance(url,str) or not url.startswith("https://github.com/"):
        raise ValueError("invalid run URL")
    evidence=json.dumps({"run_url":url[:300],"failed_jobs":failed},sort_keys=True)
    return make_plan({"schema_version":1,"kind":"ci_failure",
                      "title":"GitHub Actions failure: "+str(payload.get("name","unknown"))[:150],
                      "evidence":evidence,"paths":[]})

def main():
    src=Path(sys.argv[1])
    if src.stat().st_size>128*1024: raise ValueError("oversized event")
    result=collect(json.loads(src.read_text(encoding="utf-8")))
    Path(sys.argv[2]).write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
if __name__=="__main__": main()
