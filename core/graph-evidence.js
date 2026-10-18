'use strict';
// Optional graph evidence audit. Does not modify scanner findings or authorize actions.
const crypto=require('crypto');
function auditGraph(graph){
  if(!graph||!Array.isArray(graph.nodes)||!Array.isArray(graph.edges)) throw new TypeError('graph must contain nodes and edges');
  const ids=new Set(),issues=[],edges=[];
  for(const n of graph.nodes){
    if(!n||typeof n.id!=='string'||!n.id) {issues.push({code:'INVALID_NODE'});continue;}
    if(ids.has(n.id)) issues.push({code:'DUPLICATE_NODE',id:n.id});
    ids.add(n.id);
  }
  for(const [index,e] of graph.edges.entries()){
    if(!e||typeof e.from!=='string'||typeof e.to!=='string'||!ids.has(e.from)||!ids.has(e.to)){
      issues.push({code:'DANGLING_EDGE',index});continue;
    }
    // Missing provenance stays unverified, never silently promoted to extracted.
    const extracted=e.provenance==='EXTRACTED' && typeof e.source==='string' && e.source.length>0 &&
      Number.isInteger(e.line) && e.line>0;
    const kind=extracted?'EXTRACTED':'UNVERIFIED';
    edges.push({from:e.from,to:e.to,kind,source:extracted?e.source:null,line:extracted?e.line:null});
  }
  const hash=crypto.createHash('sha256').update(JSON.stringify({nodes:[...ids].sort(),edges:edges.slice().sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))})).digest('hex');
  return {status:issues.length?'INVALID':'AUDITED',nodes:ids.size,edges:edges.length,
    extracted:edges.filter(e=>e.kind==='EXTRACTED').length,unverified:edges.filter(e=>e.kind==='UNVERIFIED').length,issues,hash};
}
module.exports={auditGraph};
