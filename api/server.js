const http=require('http'); const fs=require('fs'); const path=require('path');
const {IntegrityEngine}=require('../core/engine'); const {SecurityGraph}=require('../core/graph');
const {runBuildGate}=require('../core/build-gate'); const {ingestProject}=require('../core/ingest-project'); const {listConnectors}=require('../connectors');
const {loadStandards}=require('../core/futureproof'); const {runAdaptiveCampaign}=require('../core/campaign'); const {ingestTelemetry}=require('../core/telemetry');
const {verifyCanary}=require('../core/canary'); const {toSarif}=require('../core/sarif'); const {differentialSecurity}=require('../core/security-diff');
const engine=new IntegrityEngine(); const graph=new SecurityGraph();
function json(res,code,obj){res.writeHead(code,{'content-type':'application/json'});res.end(JSON.stringify(obj,null,2))}
function body(req,cb){let b='';req.on('data',d=>b+=d);req.on('end',()=>{try{cb(null,b?JSON.parse(b):{})}catch(e){cb(e)}})}
const server=http.createServer((req,res)=>{
  if(req.method==='GET'&&req.url==='/api/connectors') return json(res,200,listConnectors());
  if(req.method==='GET'&&req.url==='/api/standards') return json(res,200,loadStandards());
  if(req.method==='POST'&&req.url==='/api/scan-project') return body(req,(e,x)=>{if(e)return json(res,400,{error:e.message});try{const r=ingestProject(x.path,{connector:x.connector});json(res,200,{scan:r.scan,envelope:r.envelope})}catch(err){json(res,400,{error:err.message})}});
  if(req.method==='POST'&&req.url==='/api/campaign') return body(req,(e,x)=>{if(e)return json(res,400,{error:e.message});try{json(res,200,runAdaptiveCampaign({engine,budget:Number(x.budget||6)}))}catch(err){json(res,400,{error:err.message})}});
  if(req.method==='POST'&&req.url==='/api/telemetry') return body(req,(e,x)=>e?json(res,400,{error:e.message}):json(res,200,{spans:ingestTelemetry(x)}));
  if(req.method==='POST'&&req.url==='/api/canary/verify') return body(req,(e,x)=>e?json(res,400,{error:e.message}):json(res,200,verifyCanary(x)));
  if(req.method==='POST'&&req.url==='/api/diff') return body(req,(e,x)=>e?json(res,400,{error:e.message}):json(res,200,differentialSecurity(x.before||{},x.after||{})));
  if(req.method==='GET'&&req.url==='/api/sarif') return json(res,200,toSarif(engine.getFindings()));
  if(req.method==='GET'&&req.url==='/api/status') return json(res,200,{risk:engine.getRiskSummary(),graph:graph.toJSON()});
  if(req.method==='POST'&&req.url==='/api/transition') return body(req,(e,t)=>{if(e)return json(res,400,{error:e.message});try{json(res,200,{findings:engine.ingest(t),risk:engine.getRiskSummary()})}catch(err){json(res,400,{error:err.message})}});
  if(req.method==='POST'&&req.url==='/api/node') return body(req,(e,x)=>{if(e)return json(res,400,{error:e.message});graph.addNode(x);json(res,200,graph.toJSON())});
  if(req.method==='POST'&&req.url==='/api/edge') return body(req,(e,x)=>{if(e)return json(res,400,{error:e.message});graph.addEdge(x);json(res,200,graph.toJSON())});
  if(req.method==='GET'&&req.url.startsWith('/api/blast-radius')){const u=new URL(req.url,'http://localhost');return json(res,200,graph.blastRadius(u.searchParams.get('start')))}
  if(req.method==='GET'&&req.url==='/api/gate') return json(res,200,runBuildGate({engine,graph}));
  const file=req.url==='/'?'index.html':req.url.replace(/^\//,''); const p=path.join(__dirname,'..','public',file);
  if(fs.existsSync(p)){res.writeHead(200,{'content-type':file.endsWith('.html')?'text/html':'text/plain'});return fs.createReadStream(p).pipe(res)}
  json(res,404,{error:'not found'});
});
if(require.main===module){const port=Number(process.env.PORT||8787);server.listen(port,()=>console.log(`Ethical Hacker v1.3 on http://localhost:${port}`));}
module.exports={server,engine,graph};
