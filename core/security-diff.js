function metrics(graph){
  const nodes=graph.nodes||[], edges=graph.edges||[];
  return {
    nodes:nodes.length,
    edges:edges.length,
    highRiskEdges:edges.filter(e=>['HIGH','CRITICAL'].includes(e.risk)).length,
    criticalAssets:nodes.filter(n=>['HIGH','CRITICAL'].includes(n.criticality)).length,
    privilegedReachability:edges.filter(e=>/write|admin|delegate|credential|tool|data-access/i.test(e.kind||'')).length
  };
}
function differentialSecurity(before,after){
  const b=metrics(before),a=metrics(after); const delta={};
  for(const k of Object.keys(a)) delta[k]=a[k]-b[k];
  const regressions=[];
  if(delta.highRiskEdges>0) regressions.push(`${delta.highRiskEdges} new high-risk edge(s)`);
  if(delta.privilegedReachability>0) regressions.push(`${delta.privilegedReachability} new privileged/reachable relationship(s)`);
  if(delta.criticalAssets>0) regressions.push(`${delta.criticalAssets} new high/critical asset(s)`);
  return {before:b,after:a,delta,regressions,status:regressions.length?'REGRESSION':'NO_REGRESSION'};
}
module.exports={differentialSecurity,metrics};
