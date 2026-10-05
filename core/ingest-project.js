const {runConnector}=require('../connectors');
const {SecurityGraph}=require('./graph');
const {envelope}=require('./futureproof');

function ingestProject(root,{connector='filesystem-project',scanOptions={}}={}){
  const result=runConnector(connector,root,scanOptions);

  const graph=new SecurityGraph();

  for(const n of result.graph.nodes){
    graph.addNode(n);
  }

  for(const e of result.graph.edges){
    graph.addEdge(e);
  }

  return {
    scan:result,
    graph,
    envelope:envelope(
      'project-scan',
      result,
      {source:connector}
    )
  };
}

module.exports={ingestProject};
