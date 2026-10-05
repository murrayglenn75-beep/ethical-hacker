function toSarif(findings,{toolName='Ethical Hacker',version='1.3.0'}={}){
  const rules=new Map();
  for(const f of findings){const id=f.domain||'security'; if(!rules.has(id)) rules.set(id,{id,name:id,shortDescription:{text:id}})}
  const level=s=>s==='CRITICAL'||s==='HIGH'?'error':s==='MEDIUM'?'warning':'note';
  return {version:'2.1.0',$schema:'https://json.schemastore.org/sarif-2.1.0.json',runs:[{tool:{driver:{name:toolName,version,rules:[...rules.values()]}},results:findings.map(f=>({ruleId:f.domain||'security',level:level(f.severity),message:{text:`${f.title}: ${f.reason}`},properties:{severity:f.severity,transitionId:f.transitionId||null}}))}]};
}
module.exports={toSarif};
