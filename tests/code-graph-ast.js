'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {extract,reachable}=require('../core/code-graph-ast');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'eh-ast-'));
try{
 fs.writeFileSync(path.join(root,'auth.js'),'import {issue} from "./token.js";\n');
 fs.writeFileSync(path.join(root,'token.js'),'const db=require("./database");\n');
 fs.writeFileSync(path.join(root,'database.js'),'module.exports={};\n');
 fs.writeFileSync(path.join(root,'ui.js'),'export {thing} from "./missing.js";\n');
 const g=extract(root);
 assert.equal(g.nodes.length,4);assert.equal(g.edges.length,2);assert.equal(g.unresolved.length,1);
 assert.ok(g.edges.every(e=>e.provenance==='EXTRACTED'&&e.line===1));
 assert.equal(reachable(g,'auth.js','database.js'),true);
 assert.equal(reachable(g,'ui.js','database.js'),false);
 console.log('PASS controlled AST graph dependency test');
}finally{fs.rmSync(root,{recursive:true,force:true});}
