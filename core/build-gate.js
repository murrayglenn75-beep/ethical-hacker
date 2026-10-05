const {evaluatePolicies}=require('./policy');
function runBuildGate({engine,policies=[],policyContext={},graph,diff,thresholds={maxCritical:0,maxHigh:2,maxRiskScore:20}}){
  const findings=engine.getFindings();
  const critical=findings.filter(f=>f.severity==='CRITICAL').length;
  const high=findings.filter(f=>f.severity==='HIGH').length;
  const summary=engine.getRiskSummary();
  const policy=evaluatePolicies(policies,policyContext);
  const chains=graph?graph.attackChains():[];
  const reasons=[];
  if(critical>thresholds.maxCritical) reasons.push(`${critical} critical findings exceed ${thresholds.maxCritical}`);
  if(high>thresholds.maxHigh) reasons.push(`${high} high findings exceed ${thresholds.maxHigh}`);
  if(summary.score>thresholds.maxRiskScore) reasons.push(`risk score ${summary.score} exceeds ${thresholds.maxRiskScore}`);
  if(!policy.passed) reasons.push(`${policy.failures.length} policy rule(s) failed`);
  if(diff?.riskIncrease>0) reasons.push(`${diff.riskIncrease} new high-risk graph edge(s)`);
  return {status:reasons.length?'BLOCK':'PASS',reasons,summary,critical,high,policy,attackChains:chains.slice(0,20),releaseDiff:diff||null};
}
module.exports={runBuildGate};
