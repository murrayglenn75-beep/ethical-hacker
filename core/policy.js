function evaluatePolicy(policy, ctx){
  const failures=[];
  for(const rule of policy.rules||[]){
    let ok=true;
    if(rule.type==='deny-action') ok=!(ctx.actor===rule.actor && ctx.action===rule.action);
    else if(rule.type==='max-authority') ok=Number(ctx.authority||0)<=Number(rule.value);
    else if(rule.type==='scope-subset') ok=(ctx.scope||[]).every(x=>(rule.allowed||[]).includes(x));
    else if(rule.type==='require-provenance') ok=!!ctx.provenance;
    else if(rule.type==='deny-trust-elevation') ok=!(ctx.inputTrust==='UNTRUSTED' && ['HIGH','VERIFIED'].includes(ctx.outputTrust));
    else if(rule.type==='custom' && typeof rule.test==='function') ok=!!rule.test(ctx);
    if(!ok) failures.push({policyId:policy.id,ruleId:rule.id,message:rule.message||`Policy rule ${rule.id} failed`});
  }
  return {policyId:policy.id,passed:failures.length===0,failures};
}
function evaluatePolicies(policies,ctx){
  const results=policies.map(p=>evaluatePolicy(p,ctx));
  return {passed:results.every(r=>r.passed),results,failures:results.flatMap(r=>r.failures)};
}
module.exports={evaluatePolicy,evaluatePolicies};
