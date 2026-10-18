'use strict';
const assert=require('node:assert/strict');
const {auditGraph}=require('../core/graph-evidence');
// Controlled, labelled synthetic fixture; not real-project effectiveness evidence.
const files={
 'auth.js':'import { issueToken } from "./token.js";',
 'token.js':'import { query } from "./database.js";',
 'database.js':'export const query = () => 42;',
 'ui.js':'export const render = () => "hello";'
};
const nodes=Object.keys(files).map(id=>({id}));
const edges=[
 {from:'auth.js',to:'token.js',provenance:'EXTRACTED',source:'auth.js',line:1},
 {from:'token.js',to:'database.js',provenance:'EXTRACTED',source:'token.js',line:1}
];
const report=auditGraph({nodes,edges});
assert.equal(report.status,'AUDITED');
function reachable(start,target){
 const queue=[start],seen=new Set(queue);
 while(queue.length){
  const now=queue.shift();
  if(now===target)return true;
  for(const edge of edges)if(edge.from===now&&!seen.has(edge.to)){
   seen.add(edge.to);queue.push(edge.to);
  }
 }
 return false;
}
function singleFileSearch(start,target){return files[start].includes(target.replace('.js',''));}
const queries=[
 ['auth.js','database.js',true],
 ['auth.js','token.js',true],
 ['ui.js','database.js',false],
 ['database.js','auth.js',false]
];
let graphCorrect=0,searchCorrect=0;
for(const [from,to,expected] of queries){
 if(reachable(from,to)===expected)graphCorrect++;
 if(singleFileSearch(from,to)===expected)searchCorrect++;
}
assert.equal(graphCorrect,4);
assert.equal(searchCorrect,3);
console.log(JSON.stringify({fixture:'synthetic four-file dependency example',queries:queries.length,graphCorrect,searchCorrect,warning:'Not a real-project performance or retrieval benchmark'}));
