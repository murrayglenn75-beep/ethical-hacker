const assert=require('assert');
const {IntegrityEngine}=require('../core/engine'); const {runAdaptiveCampaign}=require('../core/campaign');
const {verifyCanary}=require('../core/canary'); const {ingestTelemetry,deriveRuntimeEdges}=require('../core/telemetry');
const {toSarif}=require('../core/sarif'); const {differentialSecurity}=require('../core/security-diff');
let passed=0;function test(n,f){try{f();passed++;console.log('PASS',n)}catch(e){console.error('FAIL',n,e.stack);process.exitCode=1}}
test('adaptive campaign produces canary and findings',()=>{const e=new IntegrityEngine();const r=runAdaptiveCampaign({engine:e,budget:5});assert.ok(/^EH-/.test(r.marker));assert.ok(r.totalFindings>0);assert.ok(r.executed.length>=4)});
test('canary verification distinguishes detection/prevention',()=>{const r=verifyCanary({marker:'EH-ABC',events:[{message:'EH-ABC',kind:'detect',prevented:false},{message:'EH-ABC',kind:'block',outcome:'blocked'}]});assert.equal(r.detected,true);assert.equal(r.prevented,true)});
test('otel-like telemetry normalizes genai spans',()=>{const s=ingestTelemetry({spans:[{spanId:'1',traceId:'t',attributes:{'gen_ai.operation.name':'execute_tool','gen_ai.agent.name':'a','gen_ai.tool.name':'db'}}]});assert.equal(s[0].agent,'a');assert.equal(s[0].tool,'db')});
test('runtime edges derive from telemetry',()=>{const spans=ingestTelemetry({spans:[{spanId:'1',attributes:{'gen_ai.agent.name':'a','gen_ai.tool.name':'db'}}]});assert.equal(deriveRuntimeEdges(spans)[0].from,'agent:a')});
test('sarif output is valid shape',()=>{const s=toSarif([{domain:'x',severity:'HIGH',title:'t',reason:'r'}]);assert.equal(s.version,'2.1.0');assert.equal(s.runs[0].results.length,1)});
test('differential security catches regression',()=>{const d=differentialSecurity({nodes:[],edges:[]},{nodes:[{id:'db',criticality:'HIGH'}],edges:[{from:'a',to:'db',kind:'write-data',risk:'CRITICAL'}]});assert.equal(d.status,'REGRESSION');assert.ok(d.regressions.length>=2)});
console.log(`\n${passed}/6 v1.3 tests passed`);
