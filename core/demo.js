const {IntegrityEngine}=require('./engine');
const engine=new IntegrityEngine();
const demo=[
{id:'t1',actor:{id:'agent-a',kind:'agent',authority:40},action:'summarize_document',inputTrust:'UNTRUSTED',outputTrust:'HIGH',inputScope:{resources:['doc:42']},outputScope:{resources:['doc:42']},provenance:{sourceId:'doc:42',sourceType:'document',trust:'UNTRUSTED'}},
{id:'t2',actor:{id:'agent-b',kind:'agent',authority:30},action:'delegate_export',inputTrust:'HIGH',outputTrust:'HIGH',inputScope:{resources:['tenant:A']},outputScope:{resources:['tenant:A','tenant:B']},delegatedAuthority:80,provenance:{sourceId:'memory:9',sourceType:'memory',trust:'HIGH'}},
{id:'t3',actor:{id:'human:1',kind:'human',authority:100},action:'approve_transfer',inputTrust:'HIGH',outputTrust:'HIGH',inputScope:{resources:['transfer:1']},outputScope:{resources:['transfer:1']},executionCost:125,budget:25,provenance:{sourceId:'request:1',sourceType:'user',trust:'HIGH'},metadata:{approvalsPerMinute:45,contextUtilizationPct:92}}
];
for(const t of demo){console.log(`\n${t.id}`);for(const f of engine.ingest(t))console.log(`[${f.severity}] ${f.domain}: ${f.title} — ${f.reason}`)}
console.log('\nSUMMARY',engine.getRiskSummary());
