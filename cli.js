#!/usr/bin/env node

const fs=require('fs');
const path=require('path');

const {ingestProject}=require('./core/ingest-project');
const {listConnectors}=require('./connectors');
const {IntegrityEngine}=require('./core/engine');
const {runAdaptiveCampaign}=require('./core/campaign');
const {toSarif}=require('./core/sarif');
const {differentialSecurity}=require('./core/security-diff');
const {runBuildGate}=require('./core/build-gate');

function readJson(p){
  return JSON.parse(fs.readFileSync(path.resolve(p),'utf8'));
}

function out(x){
  console.log(JSON.stringify(x,null,2));
}

function parseProjectArgs(args){
  let root='.';
  const scanOptions={
    includeTests:false,
    includeFixtures:false,
    all:false
  };

  for(const arg of args){
    if(arg==='--include-tests'){
      scanOptions.includeTests=true;
    }else if(arg==='--include-fixtures'){
      scanOptions.includeFixtures=true;
    }else if(arg==='--all'){
      scanOptions.all=true;
      scanOptions.includeTests=true;
      scanOptions.includeFixtures=true;
    }else if(!arg.startsWith('--')){
      root=arg;
    }
  }

  return {
    root:path.resolve(root),
    scanOptions
  };
}

const [cmd,...args]=process.argv.slice(2);

try{
  if(cmd==='scan'){
    const {root,scanOptions}=parseProjectArgs(args);
    const r=ingestProject(root,{scanOptions});

    out({
      detected:r.scan.detected,
      scope:r.scan.scope,
      signals:r.scan.signals,
      graph:r.scan.graph,
      evidenceSummary:r.scan.evidenceSummary
    });

  }else if(cmd==='connectors'){
    out(listConnectors());

  }else if(cmd==='campaign'){
    const e=new IntegrityEngine();

    out({
      campaign:runAdaptiveCampaign({
        engine:e,
        budget:Number(args[0]||6)
      }),
      risk:e.getRiskSummary()
    });

  }else if(cmd==='sarif'){
    const {root,scanOptions}=parseProjectArgs(args);
    const input=root;

    if(fs.existsSync(input)&&fs.statSync(input).isDirectory()){
      const r=ingestProject(input,{scanOptions});

      const findings=r.scan.signals.map(s=>({
        id:`scan:${s.path}:${s.title}`,
        severity:s.severity,
        domain:s.domain,
        title:s.title,
        reason:`Detected in ${s.path}`,
        path:s.path
      }));

      out(toSarif(findings));

    }else{
      const findings=readJson(input);

      out(
        toSarif(
          Array.isArray(findings)
            ? findings
            : findings.findings||[]
        )
      );
    }

  }else if(cmd==='diff'){
    out(
      differentialSecurity(
        readJson(args[0]),
        readJson(args[1])
      )
    );

  }else if(cmd==='gate'){
    const {root,scanOptions}=parseProjectArgs(args);
    const r=ingestProject(root,{scanOptions});
    const e=new IntegrityEngine();

    for(const s of r.scan.signals){
      e.findings.push({
        id:`scan:${s.path}:${s.title}`,
        severity:s.severity,
        domain:s.domain,
        title:s.title,
        reason:`Detected in ${s.path}`,
        transitionId:null
      });
    }

    out(
      runBuildGate({
        engine:e,
        graph:r.graph
      })
    );

  }else{
    console.log(`
Usage:
  node cli.js scan <project-folder> [options]
  node cli.js gate <project-folder> [options]
  node cli.js campaign [budget]
  node cli.js diff <before-graph.json> <after-graph.json>
  node cli.js sarif <findings.json|project-folder> [options]
  node cli.js connectors

Scan options:
  --include-tests
  --include-fixtures
  --all
`);

    process.exitCode=1;
  }

}catch(e){
  console.error(e.stack||e.message);
  process.exitCode=1;
}
