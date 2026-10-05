const assert=require('assert'); const path=require('path');
const {scanProject}=require('../connectors/project-scanner');
const {listConnectors}=require('../connectors');
const {ingestProject}=require('../core/ingest-project');
const {envelope,validateEnvelope,compatibility,loadStandards}=require('../core/futureproof');
let passed=0;function test(n,f){try{f();passed++;console.log('PASS',n)}catch(e){console.error('FAIL',n,e.stack);process.exitCode=1}}
const root=path.join(__dirname,'..','fixtures','sample-next');
test('connector registry is extensible',()=>assert.ok(listConnectors().some(x=>x.id==='filesystem-project')));
test('detects Next.js/Supabase/AI/MCP',()=>{const r=scanProject(root);assert.equal(r.detected.framework,'nextjs');assert.equal(r.detected.supabase,true);assert.equal(r.detected.ai,true);assert.equal(r.detected.mcp,true)});
test('finds API route and secret reference',()=>{const r=scanProject(root);assert.ok(r.graph.nodes.some(n=>n.id==='api:/api/users'));assert.ok(r.graph.nodes.some(n=>n.id==='env:SUPABASE_SERVICE_ROLE_KEY'))});
test('builds attack graph from project',()=>{const r=ingestProject(root);const b=r.graph.blastRadius('api:/api/users');assert.ok(b.reachable>=2)});
test('classifies service role environment reference',()=>{const r=scanProject(root);const hit=r.signals.find(s=>s.path==='app/api/users/route.ts'&&s.domain==='secrets-security');assert.ok(hit);assert.equal(hit.title,'Supabase service-role environment reference');assert.equal(hit.severity,'INFO');assert.equal(hit.confidence,'CONTEXTUAL')});
test('future-proof envelope validates',()=>{const e=envelope('x',{a:1});assert.equal(validateEnvelope(e).valid,true);assert.equal(e.digest.length,64)});
test('schema compatibility handles future major',()=>{assert.equal(compatibility('1.2.0','1.9.0').compatible,true);assert.equal(compatibility('1.2.0','2.0.0').compatible,false)});
test('standards registry is data-driven',()=>{const s=loadStandards();assert.ok(s.frameworks.length>=4)});
test('detects local AI subsystem without external SDK',()=>{const r=scanProject(root);assert.equal(r.detected.ai,true);assert.ok(r.graph.nodes.some(n=>n.id==='capability:money-moving'))});
test('empty example service-role placeholder is informational',()=>{const r=scanProject(root);const hit=r.signals.find(s=>s.path==='.env.example'&&s.title.includes('service-role'));assert.ok(hit);assert.equal(hit.severity,'INFO')});
console.log(`\n${passed}/10 connector/future-proof tests passed`);
