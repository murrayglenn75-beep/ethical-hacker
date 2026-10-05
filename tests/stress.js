const {checkTransition}=require('../core/engine');
const trusts=['UNTRUSTED','LOW','MEDIUM','HIGH','VERIFIED'];
function rand(n){return Math.floor(Math.random()*n)}
function sample(a){return a[rand(a.length)]}
let crashes=0,totalFindings=0,critical=0;
for(let i=0;i<10000;i++){
  const inTrust=sample(trusts); const outTrust=sample(trusts);
  const authority=rand(101); const delegated=rand(121);
  const baseRes=[`tenant:${rand(4)}`];
  const outRes=[...baseRes]; if(Math.random()<0.25) outRes.push(`tenant:${4+rand(4)}`);
  const t={
    id:`r${i}`,
    actor:{id:`a${rand(30)}`,kind:sample(['human','agent','service','tool']),authority},
    action:Math.random()<0.2?'approve_action':'execute',
    inputTrust:inTrust,outputTrust:outTrust,
    inputScope:{resources:baseRes},outputScope:{resources:outRes},
    delegatedAuthority:delegated,
    executionCost:rand(500),budget:50+rand(150),
    provenance:Math.random()<0.9?{sourceId:`s${i}`,sourceType:'api',trust:inTrust}:undefined,
    metadata:{approvalsPerMinute:rand(80),contextUtilizationPct:rand(101),persistentMemoryWrite:Math.random()<0.05}
  };
  try{
    const f=checkTransition(t); totalFindings+=f.length; critical+=f.filter(x=>x.severity==='CRITICAL').length;
    for(const x of f){
      if(!x.id||!x.domain||!x.reason||x.transitionId!==t.id) throw new Error('malformed finding');
    }
  }catch(e){crashes++; console.error('CRASH',i,e.message); break;}
}
console.log(JSON.stringify({simulations:10000,crashes,totalFindings,critical},null,2));
if(crashes) process.exit(1);
