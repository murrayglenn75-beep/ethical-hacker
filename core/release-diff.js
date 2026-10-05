function releaseDiff(before,after){
  const bNodes=new Map((before.nodes||[]).map(n=>[n.id,n]));
  const aNodes=new Map((after.nodes||[]).map(n=>[n.id,n]));
  const edgeKey=e=>`${e.from}|${e.to}|${e.kind||''}`;
  const bEdges=new Map((before.edges||[]).map(e=>[edgeKey(e),e]));
  const aEdges=new Map((after.edges||[]).map(e=>[edgeKey(e),e]));
  const addedNodes=[...aNodes.keys()].filter(k=>!bNodes.has(k));
  const removedNodes=[...bNodes.keys()].filter(k=>!aNodes.has(k));
  const addedEdges=[...aEdges.keys()].filter(k=>!bEdges.has(k)).map(k=>aEdges.get(k));
  const removedEdges=[...bEdges.keys()].filter(k=>!aEdges.has(k)).map(k=>bEdges.get(k));
  const riskIncrease=addedEdges.filter(e=>['HIGH','CRITICAL'].includes(e.risk)).length;
  return {addedNodes,removedNodes,addedEdges,removedEdges,riskIncrease,changed:!!(addedNodes.length||removedNodes.length||addedEdges.length||removedEdges.length)};
}
module.exports={releaseDiff};
