const http=require('http');
const fs=require('fs');
const path=require('path');

const {IntegrityEngine}=require('../core/engine');
const {SecurityGraph}=require('../core/graph');
const {runBuildGate}=require('../core/build-gate');
const {ingestProject}=require('../core/ingest-project');
const {listConnectors}=require('../connectors');
const {loadStandards}=require('../core/futureproof');
const {runAdaptiveCampaign}=require('../core/campaign');
const {ingestTelemetry}=require('../core/telemetry');
const {verifyCanary}=require('../core/canary');
const {toSarif}=require('../core/sarif');
const {differentialSecurity}=require('../core/security-diff');

const VERSION='1.4.0-dev';

const engine=new IntegrityEngine();
const graph=new SecurityGraph();

let latestScan=null;
let latestProjectGraph=null;
let latestEnvelope=null;
let latestScanAt=null;
let latestProjectPath=null;

function json(res,code,obj){
  res.writeHead(code,{
    'content-type':'application/json',
    'cache-control':'no-store'
  });
  res.end(JSON.stringify(obj,null,2));
}

function body(req,cb){
  let b='';

  req.on('data',d=>{
    b+=d;

    if(b.length>2*1024*1024){
      req.destroy();
    }
  });

  req.on('end',()=>{
    try{
      cb(null,b?JSON.parse(b):{});
    }catch(e){
      cb(e);
    }
  });
}

function signalToFinding(s){
  return {
    id:`scan:${s.path}:${s.title}`,
    severity:s.severity,
    confidence:s.confidence,
    domain:s.domain,
    title:s.title,
    reason:`Detected in ${s.path}`,
    path:s.path,
    transitionId:null
  };
}

function buildScanEngine(){
  const e=new IntegrityEngine();

  if(latestScan){
    for(const s of latestScan.signals||[]){
      e.findings.push(signalToFinding(s));
    }
  }

  return e;
}

function activeGraph(){
  return latestProjectGraph||graph;
}

function currentGate(){
  if(!latestScan||!latestProjectGraph){
    return {
      status:'NOT_SCANNED',
      legacyStatus:'PASS',
      reasons:[],
      failReasons:[],
      warnReasons:[],
      reasonCodes:['NOT_SCANNED'],
      summary:{
        transitions:0,
        findings:0,
        score:0,
        status:'NOT_SCANNED'
      },
      critical:0,
      high:0,
      blocking:{
        critical:0,
        high:0,
        total:0
      },
      policy:{
        passed:true,
        results:[],
        failures:[]
      },
      attackChains:[],
      releaseDiff:null
    };
  }

  return runBuildGate({
    engine:buildScanEngine(),
    graph:latestProjectGraph
  });
}

function severitySummary(){
  const result={
    CRITICAL:0,
    HIGH:0,
    MEDIUM:0,
    LOW:0,
    INFO:0
  };

  for(const s of latestScan?.signals||[]){
    const sev=String(s.severity||'INFO').toUpperCase();

    if(result[sev]===undefined){
      result[sev]=0;
    }

    result[sev]++;
  }

  return result;
}

function dashboardStatus(){
  const g=activeGraph();
  const graphJson=g.toJSON();
  const gate=currentGate();

  return {
    version:VERSION,
    scanned:!!latestScan,
    scannedAt:latestScanAt,
    projectPath:latestProjectPath,
    detected:latestScan?.detected||{
      framework:null,
      supabase:false,
      ai:false,
      mcp:false
    },
    scope:latestScan?.scope||null,
    severity:severitySummary(),
    findings:latestScan?.signals||[],
    graph:graphJson,
    gate
  };
}

const server=http.createServer((req,res)=>{
  if(req.method==='GET'&&req.url==='/api/connectors'){
    return json(res,200,listConnectors());
  }

  if(req.method==='GET'&&req.url==='/api/standards'){
    return json(res,200,loadStandards());
  }

  if(req.method==='POST'&&req.url==='/api/scan-project'){
    return body(req,(e,x)=>{
      if(e)return json(res,400,{error:e.message});

      try{
        const target=path.resolve(x.path||'.');

        const scanOptions={
          includeTests:!!x.includeTests,
          includeFixtures:!!x.includeFixtures,
          all:!!x.all
        };


        const r=ingestProject(target,{
          connector:x.connector||'filesystem-project',
          scanOptions
        });

        latestScan=r.scan;
        latestProjectGraph=r.graph;
        latestEnvelope=r.envelope;
        latestScanAt=new Date().toISOString();
        latestProjectPath=target;

        return json(res,200,{
          ok:true,
          status:dashboardStatus(),
          scan:r.scan,
          gate:currentGate(),
          envelope:r.envelope
        });

      }catch(err){
        return json(res,400,{error:err.message});
      }
    });
  }

  if(req.method==='POST'&&req.url==='/api/campaign'){
    return body(req,(e,x)=>{
      if(e)return json(res,400,{error:e.message});

      try{
        return json(
          res,
          200,
          runAdaptiveCampaign({
            engine,
            budget:Number(x.budget||6)
          })
        );
      }catch(err){
        return json(res,400,{error:err.message});
      }
    });
  }

  if(req.method==='POST'&&req.url==='/api/telemetry'){
    return body(req,(e,x)=>
      e
        ?json(res,400,{error:e.message})
        :json(res,200,{spans:ingestTelemetry(x)})
    );
  }

  if(req.method==='POST'&&req.url==='/api/canary/verify'){
    return body(req,(e,x)=>
      e
        ?json(res,400,{error:e.message})
        :json(res,200,verifyCanary(x))
    );
  }

  if(req.method==='POST'&&req.url==='/api/diff'){
    return body(req,(e,x)=>
      e
        ?json(res,400,{error:e.message})
        :json(res,200,differentialSecurity(x.before||{},x.after||{}))
    );
  }

  if(req.method==='GET'&&req.url==='/api/sarif'){
    if(latestScan){
      return json(
        res,
        200,
        toSarif(latestScan.signals.map(signalToFinding))
      );
    }

    return json(res,200,toSarif(engine.getFindings()));
  }

  if(req.method==='GET'&&req.url==='/api/status'){
    return json(res,200,dashboardStatus());
  }

  if(req.method==='POST'&&req.url==='/api/transition'){
    return body(req,(e,t)=>{
      if(e)return json(res,400,{error:e.message});

      try{
        return json(res,200,{
          findings:engine.ingest(t),
          risk:engine.getRiskSummary()
        });
      }catch(err){
        return json(res,400,{error:err.message});
      }
    });
  }

  if(req.method==='POST'&&req.url==='/api/node'){
    return body(req,(e,x)=>{
      if(e)return json(res,400,{error:e.message});
      graph.addNode(x);
      return json(res,200,graph.toJSON());
    });
  }

  if(req.method==='POST'&&req.url==='/api/edge'){
    return body(req,(e,x)=>{
      if(e)return json(res,400,{error:e.message});
      graph.addEdge(x);
      return json(res,200,graph.toJSON());
    });
  }

  if(req.method==='GET'&&req.url.startsWith('/api/blast-radius')){
    const u=new URL(req.url,'http://localhost');

    try{
      return json(
        res,
        200,
        activeGraph().blastRadius(u.searchParams.get('start'))
      );
    }catch(err){
      return json(res,400,{error:err.message});
    }
  }

  if(req.method==='GET'&&req.url==='/api/gate'){
    return json(res,200,currentGate());
  }

  if(req.method==='GET'&&req.url==='/api/latest-scan'){
    return json(res,200,{
      scan:latestScan,
      envelope:latestEnvelope,
      scannedAt:latestScanAt,
      projectPath:latestProjectPath
    });
  }

  const file=req.url==='/'?'index.html':req.url.replace(/^\//,'');
  const p=path.join(__dirname,'..','public',file);

  if(fs.existsSync(p)&&fs.statSync(p).isFile()){
    const contentType=
      file.endsWith('.html')?'text/html; charset=utf-8':
      file.endsWith('.js')?'text/javascript; charset=utf-8':
      file.endsWith('.css')?'text/css; charset=utf-8':
      'text/plain; charset=utf-8';

    res.writeHead(200,{
      'content-type':contentType,
      'cache-control':'no-store'
    });

    return fs.createReadStream(p).pipe(res);
  }

  return json(res,404,{error:'not found'});
});

if(require.main===module){
  const port=Number(process.env.PORT||8787);

  const host=process.env.HOST||'127.0.0.1';

  server.listen(port,host,()=>{
    console.log(
      `Ethical Hacker v${VERSION} on http://${host}:${port}`
    );
  });
}

module.exports={
  server,
  engine,
  graph,
  dashboardStatus,
  currentGate
};
