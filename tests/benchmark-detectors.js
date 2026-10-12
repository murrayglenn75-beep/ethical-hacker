'use strict';
// Synthetic smoke benchmark. Not an independent vulnerability benchmark.
// Each case is an isolated temporary project. No real credentials or third-party targets.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {scanProject}=require('../connectors/project-scanner');

const CASES=[
  {id:'assigned-service-role',file:'.env',source:'SUPABASE_SERVICE_ROLE_KEY=synthetic-test-value-not-a-real-key\n',expected:['secrets-security|Potential hard-coded Supabase service-role credential'],negative:[]},
  {id:'runtime-execution',file:'src/runner.ts',source:'const code = eval(input);\n',expected:['runtime-integrity|Dynamic or shell execution surface'],negative:[]},
  {id:'raw-html-rendering',file:'src/view.tsx',source:'export const View=({text}) => <div dangerouslySetInnerHTML={{__html:text}} />;\n',expected:['application-security|Raw HTML rendering surface'],negative:[]},
  {id:'empty-example-env',file:'.env.example',source:'SUPABASE_SERVICE_ROLE_KEY=\n',expected:[],negative:['secrets-security|Potential hard-coded Supabase service-role credential']},
  {id:'environment-reference',file:'src/server.ts',source:'const key=process.env.SUPABASE_SERVICE_ROLE_KEY;\n',expected:[],negative:['secrets-security|Potential hard-coded Supabase service-role credential']},
  {id:'python-subprocess',file:'src/task.py',source:'import subprocess\\nsubprocess.run([\"echo\",\"safe\"], check=True)\\n',expected:['runtime-integrity|Python dynamic or process execution surface'],negative:[]},
  {id:'python-ordinary',file:'src/task.py',source:'def health():\\n    return True\\n',expected:[],negative:['runtime-integrity|Python dynamic or process execution surface']},
  {id:'ordinary-source',file:'src/health.ts',source:'export const health = () => ({ok:true});\n',expected:[],negative:['runtime-integrity|Dynamic or shell execution surface','secrets-security|Potential hard-coded Supabase service-role credential']}
];

function run(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'ethical-hacker-benchmark-'));
  let tp=0,fp=0,fn=0;
  const results=[];
  try{
    for(const c of CASES){
      const folder=path.join(root,c.id);
      const file=path.join(folder,c.file);
      fs.mkdirSync(path.dirname(file),{recursive:true});
      fs.writeFileSync(file,c.source,'utf8');
      const scan=scanProject(folder);
      const actual=new Set(scan.signals.map(s=>s.domain+'|'+s.title));
      const missing=c.expected.filter(x=>!actual.has(x));
      const unexpected=c.negative.filter(x=>actual.has(x));
      tp+=c.expected.length-missing.length;
      fn+=missing.length;
      fp+=unexpected.length;
      results.push({id:c.id,passed:missing.length===0&&unexpected.length===0,missing,unexpected,detected:[...actual].sort()});
    }
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
  const output={
    schemaVersion:1,
    benchmark:'synthetic-detector-smoke-v1',
    independent:false,
    cases:results.length,
    truePositiveAssertions:tp,
    falseNegativeAssertions:fn,
    falsePositiveAssertions:fp,
    recall:tp+fn?tp/(tp+fn):null,
    note:'These are labeled assertions on synthetic inputs, not a complete precision/recall estimate. Unlabeled detections are not counted as false positives.',
    results
  };
  console.log(JSON.stringify(output,null,2));
  assert.ok(results.every(x=>x.passed),'synthetic benchmark assertions must pass');
}
run();
