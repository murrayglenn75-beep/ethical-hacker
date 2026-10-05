const assert=require('assert');
const {checkTransition,IntegrityEngine}=require('../core/engine');
const base={id:'base',actor:{id:'agent',kind:'agent',authority:50},action:'read',inputTrust:'LOW',outputTrust:'LOW',inputScope:{resources:['a']},outputScope:{resources:['a']},provenance:{sourceId:'a',sourceType:'api',trust:'LOW'}};
function has(f,domain){return f.some(x=>x.domain===domain)}
let passed=0;
function test(name,fn){try{fn();passed++;console.log('PASS',name)}catch(e){console.error('FAIL',name,'-',e.message);process.exitCode=1}}

test('safe transition',()=>assert.equal(checkTransition(base).length,0));
test('trust laundering',()=>assert.ok(has(checkTransition({...base,outputTrust:'HIGH'}),'trust-integrity')));
test('verified trust elevation',()=>assert.ok(!has(checkTransition({...base,outputTrust:'HIGH',metadata:{verifiedTrustElevation:true}}),'trust-integrity')));
test('authority expansion',()=>assert.ok(has(checkTransition({...base,delegatedAuthority:80}),'authority-integrity')));
test('scope expansion',()=>assert.ok(has(checkTransition({...base,outputScope:{resources:['a','b']}}),'scope-integrity')));
test('budget overload',()=>assert.ok(has(checkTransition({...base,executionCost:20,budget:10}),'overload-economic')));
test('approval fatigue',()=>assert.ok(has(checkTransition({...base,actor:{id:'h',kind:'human',authority:100},action:'approve',metadata:{approvalsPerMinute:40}}),'human-security')));
test('context saturation',()=>assert.ok(has(checkTransition({...base,metadata:{contextUtilizationPct:95}}),'overload-context')));
test('memory corruption',()=>assert.ok(has(checkTransition({...base,inputTrust:'UNTRUSTED',outputTrust:'HIGH',metadata:{persistentMemoryWrite:true},provenance:{sourceId:'doc',sourceType:'document',trust:'UNTRUSTED'}}),'memory-integrity')));
test('risk summary',()=>{const e=new IntegrityEngine();e.ingest({...base,outputTrust:'HIGH'});assert.equal(e.getRiskSummary().status,'DEGRADED')});

console.log(`\n${passed}/10 tests passed`);
