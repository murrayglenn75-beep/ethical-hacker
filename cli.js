#!/usr/bin/env node
const fs=require('fs'); const path=require('path');
const {ingestProject}=require('./core/ingest-project'); const {listConnectors}=require('./connectors');
const {IntegrityEngine}=require('./core/engine'); const {runAdaptiveCampaign}=require('./core/campaign');
const {toSarif}=require('./core/sarif'); const {differentialSecurity}=require('./core/security-diff'); const {runBuildGate}=require('./core/build-gate');
function readJson(p){return JSON.parse(fs.readFileSync(path.resolve(p),'utf8'))}
function out(x){console.log(JSON.stringify(x,null,2))}
const [cmd,...args]=process.argv.slice(2);
try{
  if(cmd==='scan'){
    const root=path.resolve(args[0]||'.'); const r=ingestProject(root); out({detected:r.scan.detected,signals:r.scan.signals,graph:r.scan.graph,evidenceSummary:r.scan.evidenceSummary});
  }else if(cmd==='connectors') out(listConnectors());
  else if(cmd==='campaign'){
    const e=new IntegrityEngine(); out({campaign:runAdaptiveCampaign({engine:e,budget:Number(args[0]||6)}),risk:e.getRiskSummary()});
  }else if(cmd==='sarif'){
    const input=path.resolve(args[0]||'findings.json');
    if(fs.existsSync(input)&&fs.statSync(input).isDirectory()){
      const r=ingestProject(input);
      const findings=r.scan.signals.map(s=>({id:`scan:${s.path}:${s.title}`,severity:s.severity,domain:s.domain,title:s.title,reason:`Detected in ${s.path}`,path:s.path}));
      out(toSarif(findings));
    }else{
      const findings=readJson(input); out(toSarif(Array.isArray(findings)?findings:findings.findings||[]));
    }
  }else if(cmd==='diff'){
    out(differentialSecurity(readJson(args[0]),readJson(args[1])));
  }else if(cmd==='gate'){
    const root=path.resolve(args[0]||'.'); const r=ingestProject(root); const e=new IntegrityEngine();
    for(const s of r.scan.signals) e.findings.push({id:`scan:${s.path}:${s.title}`,severity:s.severity,domain:s.domain,title:s.title,reason:`Detected in ${s.path}`,transitionId:null});
    out(runBuildGate({engine:e,graph:r.graph}));
  }else{
    console.log('Usage:\n  node cli.js scan <project-folder>\n  node cli.js gate <project-folder>\n  node cli.js campaign [budget]\n  node cli.js diff <before-graph.json> <after-graph.json>\n  node cli.js sarif <findings.json|project-folder>\n  node cli.js connectors'); process.exitCode=1;
  }
}catch(e){console.error(e.message);process.exitCode=1}
