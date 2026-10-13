"""Conservative Git changed-file impact gate. Read-only local Git."""
import argparse,json,subprocess
from pathlib import Path
HIGH_RISK=('auth/','security/','policy/','supabase/migrations/','db/migrations/','.github/workflows/','core/engine','package-lock.json','pyproject.toml')
def git(repo,*args):
    return subprocess.check_output(['git','-C',str(repo),*args],stderr=subprocess.PIPE)
def parse_changes(blob):
    items=blob.decode('utf-8','surrogateescape').split('\0'); found=[];i=0
    while i<len(items) and items[i]:
        status=items[i];i+=1
        if status[0] not in 'ACDMRTUXB': raise ValueError('unrecognized git status')
        old=items[i];i+=1
        if status[0] in 'RC':
            new=items[i];i+=1
            found.extend([old,new])
        else: found.append(old)
    return sorted(set(found))
def evaluate(paths):
    reasons=[]
    for p in paths:
        normalized=p.replace('\\','/')
        if normalized.startswith(HIGH_RISK) or any(part in normalized for part in ('/auth/','/security/')):
            reasons.append('high-impact: '+normalized)
    if not paths: return {'decision':'FULL','reason':['no confirmed diff: fail closed'],'files':[]}
    if reasons:return {'decision':'FULL','reason':reasons,'files':paths}
    return {'decision':'TARGETED_PLUS_REQUIRED_BASELINE','reason':['low-impact diff; never skip required baseline checks'],'files':paths}
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--repo',default='.');ap.add_argument('--base',required=True);ap.add_argument('--head',default='HEAD');args=ap.parse_args()
    try:
        root=Path(args.repo).resolve()
        git(root,'rev-parse','--is-inside-work-tree')
        diff=git(root,'diff','--name-status','-z','--find-renames',args.base+'...'+args.head,'--')
        result=evaluate(parse_changes(diff))
    except (OSError,ValueError,subprocess.CalledProcessError) as ex:
        result={'decision':'FULL','reason':['unable to establish safe diff: '+type(ex).__name__],'files':[]}
    print(json.dumps(result,indent=2))
if __name__=='__main__':main()
