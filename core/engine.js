const trustRank = { UNTRUSTED:0, LOW:1, MEDIUM:2, HIGH:3, VERIFIED:4 };

function mk(t, domain, title, reason, severity='HIGH') {
  return { id:`${t.id}:${domain}:${title}`, severity, domain, title, reason, transitionId:t.id };
}

function checkTransition(t) {
  const findings=[];
  if (trustRank[t.outputTrust] > trustRank[t.inputTrust] && t.metadata?.verifiedTrustElevation !== true) {
    findings.push(mk(t,'trust-integrity','Unverified trust elevation',`${t.inputTrust} became ${t.outputTrust} without verified elevation.`,'CRITICAL'));
  }
  if (typeof t.delegatedAuthority === 'number' && t.delegatedAuthority > t.actor.authority) {
    findings.push(mk(t,'authority-integrity','Authority expansion',`Delegated authority ${t.delegatedAuthority} exceeds actor authority ${t.actor.authority}.`,'CRITICAL'));
  }
  const inSet=new Set(t.inputScope.resources);
  const expanded=t.outputScope.resources.filter(r=>!inSet.has(r));
  if (expanded.length && t.metadata?.verifiedScopeExpansion !== true) {
    findings.push(mk(t,'scope-integrity','Scope expansion',`Transition expanded scope to: ${expanded.join(', ')}.`,'CRITICAL'));
  }
  if (t.outputTrust !== 'UNTRUSTED' && !t.provenance) {
    findings.push(mk(t,'provenance-integrity','Missing provenance','Trusted output has no provenance chain.','HIGH'));
  }
  if (typeof t.executionCost==='number' && typeof t.budget==='number' && t.executionCost>t.budget) {
    findings.push(mk(t,'overload-economic','Execution budget exceeded',`Cost ${t.executionCost} exceeded budget ${t.budget}.`,'HIGH'));
  }
  const approvalsPerMinute=Number(t.metadata?.approvalsPerMinute ?? 0);
  if (t.actor.kind==='human' && approvalsPerMinute>=30 && t.action.toLowerCase().includes('approve')) {
    findings.push(mk(t,'human-security','Approval fatigue risk',`Approval rate ${approvalsPerMinute}/min may undermine meaningful human review.`,'MEDIUM'));
  }
  const contextUtil=Number(t.metadata?.contextUtilizationPct ?? 0);
  if (contextUtil>=90) {
    findings.push(mk(t,'overload-context','Context saturation',`Context utilization is ${contextUtil}%.`,'HIGH'));
  }
  if (t.metadata?.persistentMemoryWrite===true && t.inputTrust==='UNTRUSTED' && t.outputTrust!=='UNTRUSTED') {
    findings.push(mk(t,'memory-integrity','Untrusted input persisted as trusted memory','Persistent memory write elevated untrusted content.','CRITICAL'));
  }
  return findings;
}

class IntegrityEngine {
  constructor(){ this.transitions=[]; this.findings=[]; }
  ingest(t){ this.transitions.push(t); const f=checkTransition(t); this.findings.push(...f); return f; }
  getFindings(){ return [...this.findings]; }
  getTransitions(){ return [...this.transitions]; }
  getRiskSummary(){
    const weights={LOW:1,MEDIUM:3,HIGH:7,CRITICAL:12};
    const score=this.findings.reduce((s,f)=>s+weights[f.severity],0);
    return {transitions:this.transitions.length,findings:this.findings.length,score,status:score>=24?'CRITICAL':score>=12?'DEGRADED':score>=5?'PRESSURED':'NORMAL'};
  }
}

module.exports={checkTransition,IntegrityEngine};
