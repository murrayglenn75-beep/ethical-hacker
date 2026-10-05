const fs=require('fs'); const path=require('path'); const crypto=require('crypto');
function loadStandards(file=path.join(__dirname,'..','standards','registry.json')){return JSON.parse(fs.readFileSync(file,'utf8'))}
function validateEnvelope(x){
  const errors=[];
  if(!x||typeof x!=='object') errors.push('envelope must be object');
  if(!x.schemaVersion) errors.push('schemaVersion required');
  if(!x.kind) errors.push('kind required');
  if(!x.payload) errors.push('payload required');
  return {valid:errors.length===0,errors};
}
function envelope(kind,payload,{schemaVersion='1.0.0',source='local',extensions={}}={}){
  const createdAt=new Date().toISOString();
  const body={schemaVersion,kind,source,createdAt,payload,extensions};
  return {...body,digest:crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex')};
}
function compatibility(a,b){
  const ma=String(a).split('.')[0], mb=String(b).split('.')[0];
  return {compatible:ma===mb,mode:ma===mb?'same-major':'migration-required',from:a,to:b};
}
module.exports={loadStandards,validateEnvelope,envelope,compatibility};
