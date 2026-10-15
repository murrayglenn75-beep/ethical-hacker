'use strict';
// Labelled, self-contained rule benchmark: NOT a real-world scanner accuracy study.
const {checkTransition}=require('../core/engine');
const fixtures=[
  {id:'normal',label:[],patch:{}},
  {id:'trust-laundering',label:['trust-integrity'],patch:{outputTrust:'HIGH'}},
  {id:'authority-escalation',label:['authority-integrity'],patch:{delegatedAuthority:90}},
  {id:'scope-escalation',label:['scope-integrity'],patch:{outputScope:{resources:['a','b']}}},
  {id:'memory-poisoning',label:['trust-integrity','memory-integrity'],patch:{inputTrust:'UNTRUSTED',outputTrust:'HIGH',metadata:{persistentMemoryWrite:true}}},
];
const baseline={id:'base',actor:{id:'agent',kind:'agent',authority:50},action:'read',inputTrust:'LOW',outputTrust:'LOW',inputScope:{resources:['a']},outputScope:{resources:['a']},provenance:{sourceId:'a',sourceType:'api',trust:'LOW'}};
function measure(){
  let tp=0,fp=0,fn=0,tn=0;const cases=[];
  for(const f of fixtures){
    const predicted=[...new Set(checkTransition({...baseline,...f.patch}).map(x=>x.domain))].sort();
    const expected=[...new Set(f.label)].sort();
    const union=new Set([...predicted,...expected]);
    for(const domain of union){
      const actual=expected.includes(domain), found=predicted.includes(domain);
      if(actual&&found)tp++;else if(found)fp++;else if(actual)fn++;
    }
    if(!union.size)tn++;
    cases.push({id:f.id,expected,predicted,exact:JSON.stringify(expected)===JSON.stringify(predicted)});
  }
  const precision=tp+fp?tp/(tp+fp):null,recall=tp+fn?tp/(tp+fn):null;
  return {dataset:'synthetic-labelled-engine-v1',fixture_count:fixtures.length,tp,fp,fn,tn,precision,recall,exact_case_accuracy:cases.filter(c=>c.exact).length/cases.length,cases};
}
if(require.main===module){const report=measure();process.stdout.write(JSON.stringify(report,null,2)+'\n');if(report.exact_case_accuracy!==1)process.exitCode=1;}
module.exports={measure};
