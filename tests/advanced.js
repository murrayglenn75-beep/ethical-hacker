const assert=require('assert');
const {IntegrityEngine}=require('../core/engine');
const {SecurityGraph}=require('../core/graph');
const {evaluatePolicies}=require('../core/policy');
const {releaseDiff}=require('../core/release-diff');
const {runBuildGate}=require('../core/build-gate');
const {createSecurityProof}=require('../core/proofs');
let passed=0; function test(n,f){try{f();passed++;console.log('PASS',n)}catch(e){console.error('FAIL',n,e.message);process.exitCode=1}}

test('blast radius traverses graph',()=>{const g=new SecurityGraph();g.addNode({id:'a'}).addNode({id:'b',criticality:'HIGH'}).addNode({id:'c',criticality:'CRITICAL'});g.addEdge({from:'a',to:'b',risk:'HIGH'}).addEdge({from:'b',to:'c',risk:'CRITICAL'});const r=g.blastRadius('a');assert.equal(r.reachable,2);assert.equal(r.criticalReachable,2)});
test('attack chain detection',()=>{const g=new SecurityGraph();['a','b','c'].forEach(id=>g.addNode({id}));g.addEdge({from:'a',to:'b',risk:'LOW'}).addEdge({from:'b',to:'c',risk:'CRITICAL'});assert.ok(g.attackChains().some(x=>x.path.join('>')==='a>b>c'))});
test('policy-as-code blocks action',()=>{const r=evaluatePolicies([{id:'p1',rules:[{id:'r1',type:'deny-action',actor:'agent',action:'delete'}]}],{actor:'agent',action:'delete'});assert.equal(r.passed,false)});
test('release diff sees risky edge',()=>{const d=releaseDiff({nodes:[],edges:[]},{nodes:[],edges:[{from:'a',to:'b',risk:'CRITICAL'}]});assert.equal(d.riskIncrease,1)});
test('build gate fails critical',()=>{const e=new IntegrityEngine();e.ingest({id:'x',actor:{id:'a',kind:'agent',authority:10},action:'x',inputTrust:'LOW',outputTrust:'HIGH',inputScope:{resources:['a']},outputScope:{resources:['a']},provenance:{sourceId:'x'}});const r=runBuildGate({engine:e});assert.equal(r.status,'FAIL');assert.equal(r.legacyStatus,'BLOCK')});

test('build gate warns on high attack chain',()=>{const e=new IntegrityEngine();const g=new SecurityGraph();g.addNode({id:'root'}).addNode({id:'ai'}).addNode({id:'mcp'});g.addEdge({from:'root',to:'ai',risk:'HIGH'}).addEdge({from:'ai',to:'mcp',risk:'HIGH'});const r=runBuildGate({engine:e,graph:g});assert.equal(r.status,'WARN');assert.ok(r.reasonCodes.includes('HIGH_ATTACK_CHAIN'))});

test('build gate passes clean project',()=>{const e=new IntegrityEngine();const g=new SecurityGraph();g.addNode({id:'root'});const r=runBuildGate({engine:e,graph:g});assert.equal(r.status,'PASS');assert.equal(r.failReasons.length,0);assert.equal(r.warnReasons.length,0)});
test('security proof is deterministic shape',()=>{const p=createSecurityProof({name:'isolation',build:'abc',checks:[{name:'tenant',passed:true}]});assert.equal(p.passed,true);assert.equal(p.digest.length,64)});
test('contextual high does not fail gate',()=>{const e=new IntegrityEngine();e.findings.push({id:'ctx',severity:'HIGH',confidence:'CONTEXTUAL',domain:'test',title:'Contextual architecture risk',reason:'context only'});const r=runBuildGate({engine:e,thresholds:{maxCritical:0,maxHigh:99,maxRiskScore:999,warnOnHighAttackChain:true,failOnCriticalAttackChain:false,failOnRiskIncrease:false}});assert.notEqual(r.status,'FAIL')});
console.log(`\n${passed}/9 advanced tests passed`);
