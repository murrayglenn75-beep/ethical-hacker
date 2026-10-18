'use strict';
// Optional read-only TypeScript AST extractor. Requires npm install --no-save typescript@5.9.3
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const EXT=['.js','.cjs','.mjs','.ts','.tsx','.jsx'];
function extract(root){
 const base=fs.realpathSync(root),files=[];
 function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  if(['node_modules','.git','.next','dist','build','coverage'].includes(e.name)||e.isSymbolicLink())continue;
  const p=path.join(dir,e.name);
  if(e.isDirectory())walk(p);else if(e.isFile()&&EXT.includes(path.extname(e.name)))files.push(p);
 }}
 walk(base);
 const known=new Map(files.map(p=>[path.relative(base,p).split(path.sep).join('/'),p]));
 const nodes=[...known.keys()].sort().map(id=>({id})),edges=[],unresolved=[];
 for(const [id,abs] of known){
  const tree=ts.createSourceFile(id,fs.readFileSync(abs,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function add(spec,node){
   if(!spec.startsWith('.'))return;
   const target=path.posix.normalize(path.posix.join(path.posix.dirname(id),spec));
   const choices=[target,...EXT.map(ext=>target+ext),...EXT.map(ext=>target+'/index'+ext)];
   const resolved=choices.find(c=>known.has(c));
   const line=tree.getLineAndCharacterOfPosition(node.getStart(tree)).line+1;
   if(!resolved){unresolved.push({from:id,spec,line});return;}
   edges.push({from:id,to:resolved,provenance:'EXTRACTED',source:id,line,spec});
  }
  function visit(node){
   if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier))add(node.moduleSpecifier.text,node);
   if(ts.isCallExpression(node)&&node.arguments.length===1&&ts.isStringLiteral(node.arguments[0])&&
      (node.expression.kind===ts.SyntaxKind.ImportKeyword||(ts.isIdentifier(node.expression)&&node.expression.text==='require')))add(node.arguments[0].text,node);
   ts.forEachChild(node,visit);
  }
  visit(tree);
 }
 edges.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 return {nodes,edges,unresolved,parser:ts.version,scope:'local literal imports/exports/require/dynamic import only'};
}
function reachable(g,from,to){const q=[from],seen=new Set(q);while(q.length){const n=q.shift();if(n===to)return true;for(const e of g.edges)if(e.from===n&&!seen.has(e.to)){seen.add(e.to);q.push(e.to);}}return false;}
if(require.main===module){if(!process.argv[2]){console.error('Usage: node code-graph-ast.js <root>');process.exit(2);}console.log(JSON.stringify(extract(process.argv[2]),null,2));}
module.exports={extract,reachable};
