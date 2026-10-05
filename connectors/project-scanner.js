const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

const DEFAULT_IGNORES=new Set(['node_modules','.git','.next','dist','build','coverage','.turbo']);
const TEXT_EXT=new Set(['.js','.jsx','.ts','.tsx','.mjs','.cjs','.json','.sql','.toml','.yaml','.yml','.md','.env','.txt']);

function sha256(s){return crypto.createHash('sha256').update(s).digest('hex')}
function safeRead(file,max=1024*1024){const st=fs.statSync(file);if(st.size>max)return null;return fs.readFileSync(file,'utf8')}
function walk(root,{maxFiles=5000,ignore=DEFAULT_IGNORES}={}){const out=[];const q=[root];while(q.length&&out.length<maxFiles){const cur=q.pop();for(const e of fs.readdirSync(cur,{withFileTypes:true})){if(ignore.has(e.name))continue;const p=path.join(cur,e.name);if(e.isDirectory())q.push(p);else out.push(p);if(out.length>=maxFiles)break;}}return out}
function rel(root,p){return path.relative(root,p).replace(/\\/g,'/')}
function addNode(nodes,node){if(!nodes.has(node.id))nodes.set(node.id,node)}
function addEdge(edges,e){const key=`${e.from}|${e.to}|${e.kind}`;if(!edges._seen)edges._seen=new Set();if(!edges._seen.has(key)){edges._seen.add(key);edges.push(e)}}
function isExampleEnv(r){return /(^|\/)\.env(?:\.[^/]+)?\.example$/.test(r)||/(^|\/)\.env\.example$/.test(r)}
function hasAssignedSecret(text,key){const re=new RegExp(`^[ \t]*${key}[ \t]*=[ \t]*([^#\r\n]+)`,`mi`);const m=text.match(re);return !!(m&&m[1].trim())}
function looksLikeLocalAIPath(r){return /(^|\/)(lib|src)\/ai\//i.test(r)||/(^|\/)app\/api\/ai\//i.test(r)||/(^|\/)agents?\//i.test(r)}

function scanProject(root,opts={}){
  root=path.resolve(root);
  if(!fs.existsSync(root)||!fs.statSync(root).isDirectory())throw new Error('project root must be a directory');
  const files=walk(root,opts);const nodes=new Map();const edges=[];const evidence=[];const signals=[];const fileFacts=new Map();
  addNode(nodes,{id:'project:root',kind:'project',label:path.basename(root),criticality:'MEDIUM',provenance:{path:root}});

  let pkg={};const pkgPath=path.join(root,'package.json');
  if(fs.existsSync(pkgPath)){
    try{pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));}catch{}
    for(const [name,version] of Object.entries({...pkg.dependencies,...pkg.devDependencies})){
      const id=`dep:${name}`;addNode(nodes,{id,kind:'dependency',label:name,version:String(version),criticality:'LOW'});addEdge(edges,{from:'project:root',to:id,kind:'depends-on',risk:'LOW'});
    }
  }

  for(const file of files){
    const r=rel(root,file),ext=path.extname(file).toLowerCase();
    if(!TEXT_EXT.has(ext)&&!path.basename(file).startsWith('.env'))continue;
    let text;try{text=safeRead(file)}catch{continue}if(text==null)continue;
    const ev={path:r,sha256:sha256(text)};evidence.push(ev);
    const facts={supabase:false,ai:false,mcp:false,routeId:null};fileFacts.set(r,facts);

    const routeMatch=r.match(/(?:^|\/)app\/api\/(.+?)\/(?:route\.(?:js|ts)|index\.(?:js|ts))$/)||r.match(/(?:^|\/)pages\/api\/(.+?)\.(?:js|ts)$/);
    if(routeMatch){const route='/api/'+routeMatch[1].replace(/\/route$/,'');const id=`api:${route}`;facts.routeId=id;addNode(nodes,{id,kind:'api-route',label:route,criticality:'MEDIUM',provenance:ev});addEdge(edges,{from:'project:root',to:id,kind:'exposes',risk:'MEDIUM'});}

    const usesSupabase=/createClient\s*\(|@supabase\/(?:supabase-js|ssr)|SUPABASE_/i.test(text);
    if(usesSupabase){facts.supabase=true;addNode(nodes,{id:'service:supabase',kind:'data-service',label:'Supabase',criticality:'HIGH'});addEdge(edges,{from:'project:root',to:'service:supabase',kind:'uses',risk:'MEDIUM'});}

    if(/service_role|SUPABASE_SERVICE_ROLE/i.test(text)){
      if(isExampleEnv(r)&&!hasAssignedSecret(text,'SUPABASE_SERVICE_ROLE_KEY')){
        signals.push({domain:'secrets-security',severity:'INFO',title:'Supabase service-role placeholder declared',path:r,evidence:ev});
      }else{
        signals.push({domain:'secrets-security',severity:r.startsWith('app/')||r.startsWith('pages/')?'CRITICAL':'HIGH',title:'Supabase service-role reference',path:r,evidence:ev});
      }
    }

    const usesAI=/\b(openai|anthropic|gemini|vertexai|bedrock|ollama|langchain|langgraph|crewai|autogen)\b/i.test(text)||looksLikeLocalAIPath(r)||/from\s+["'][^"']*\/ai\//i.test(text)||/READ_ONLY_AI_TOOLS|MONEY_MOVING_TOOLS|action_draft/i.test(text);
    if(usesAI){facts.ai=true;addNode(nodes,{id:'service:ai',kind:'ai-service',label:'AI/Agent Runtime',criticality:'HIGH'});addEdge(edges,{from:'project:root',to:'service:ai',kind:'uses-ai',risk:'HIGH'});}

    if(/\b(mcp|model context protocol)\b/i.test(text)){facts.mcp=true;addNode(nodes,{id:'service:mcp',kind:'tool-protocol',label:'MCP',criticality:'HIGH'});addEdge(edges,{from:'service:ai',to:'service:mcp',kind:'tool-access',risk:'HIGH'});}

    const keys=[...text.matchAll(/(?:process\.env|import\.meta\.env)\.([A-Z0-9_]+)/g)].map(m=>m[1]);
    for(const k of new Set(keys)){const id=`env:${k}`;const sensitive=/SECRET|TOKEN|KEY|PASSWORD|SERVICE_ROLE/.test(k);addNode(nodes,{id,kind:'env-reference',label:k,criticality:sensitive?'HIGH':'LOW'});addEdge(edges,{from:'project:root',to:id,kind:'reads-env',risk:sensitive?'HIGH':'LOW'});}

    if(/create policy|alter table .* enable row level security|row level security|\bRLS\b/i.test(text)){addNode(nodes,{id:'control:supabase-rls',kind:'security-control',label:'Supabase RLS',criticality:'HIGH'});addEdge(edges,{from:'service:supabase',to:'control:supabase-rls',kind:'governed-by',risk:'LOW'});}
    if(/eval\s*\(|new Function\s*\(|child_process|exec\s*\(|spawn\s*\(/.test(text))signals.push({domain:'runtime-integrity',severity:'HIGH',title:'Dynamic or shell execution surface',path:r,evidence:ev});
    if(/dangerouslySetInnerHTML/.test(text))signals.push({domain:'application-security',severity:'MEDIUM',title:'Raw HTML rendering surface',path:r,evidence:ev});
    if(/MONEY_MOVING_TOOLS/.test(text)){addNode(nodes,{id:'capability:money-moving',kind:'capability',label:'Money-moving tools',criticality:'CRITICAL',provenance:ev});addEdge(edges,{from:'service:ai',to:'capability:money-moving',kind:'declares-capability',risk:'HIGH'});}
  }

  for(const [r,f] of fileFacts){
    if(!f.routeId)continue;
    if(f.supabase)addEdge(edges,{from:f.routeId,to:'service:supabase',kind:'data-access',risk:'HIGH',evidence:{path:r}});
    if(f.ai)addEdge(edges,{from:f.routeId,to:'service:ai',kind:'ai-call',risk:'HIGH',evidence:{path:r}});
  }

  const graph={nodes:[...nodes.values()],edges:[...edges]};
  return {schemaVersion:'1.1.0',connector:'filesystem-project',connectorVersion:'1.1.0',root,detected:{framework:pkg.dependencies?.next||pkg.devDependencies?.next?'nextjs':null,supabase:nodes.has('service:supabase'),ai:nodes.has('service:ai'),mcp:nodes.has('service:mcp')},graph,signals,evidenceSummary:{filesScanned:evidence.length,evidenceHashes:evidence.slice(0,100)}};
}
module.exports={scanProject};
