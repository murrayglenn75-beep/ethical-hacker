const {createCanary}=require('./canary');
const DEFAULT_STEPS=[
  {id:'probe-trust',kind:'trust',description:'Check whether untrusted input can gain trust without verification.'},
  {id:'probe-authority',kind:'authority',description:'Check whether delegated authority can exceed origin authority.'},
  {id:'probe-scope',kind:'scope',description:'Check whether an action can expand beyond authorized scope.'},
  {id:'probe-overload',kind:'overload',description:'Check whether work can exceed explicit execution budget.'}
];
function runAdaptiveCampaign({engine,budget=4,steps=DEFAULT_STEPS}={}){
  if(!engine) throw new Error('engine required');
  const marker=createCanary(); const executed=[];
  const mk=(s,i)=>({id:`campaign-${i}-${s.id}`,actor:{id:'sim-agent',kind:'agent',authority:30},action:s.id,inputTrust:'UNTRUSTED',outputTrust:s.kind==='trust'?'HIGH':'UNTRUSTED',delegatedAuthority:s.kind==='authority'?80:undefined,inputScope:{resources:['sandbox']},outputScope:{resources:s.kind==='scope'?['sandbox','out-of-scope']:['sandbox']},provenance:{sourceId:marker,sourceType:'synthetic',trust:'UNTRUSTED'},executionCost:s.kind==='overload'?100:1,budget:20,metadata:{canary:marker,persistentMemoryWrite:s.kind==='trust'}});
  for(let i=0;i<Math.min(budget,steps.length);i++){
    const transition=mk(steps[i],i); const findings=engine.ingest(transition); executed.push({step:steps[i],transition,findings});
    if(findings.some(f=>f.severity==='CRITICAL')&&executed.length<budget){
      // Adapt safely by prioritizing provenance verification after a critical synthetic finding.
      steps=[...steps.slice(0,i+1),{id:'probe-provenance',kind:'provenance',description:'Check provenance preservation after critical path.'},...steps.slice(i+1)];
    }
  }
  return {marker,executed,totalFindings:executed.reduce((n,x)=>n+x.findings.length,0)};
}
module.exports={runAdaptiveCampaign,DEFAULT_STEPS};
