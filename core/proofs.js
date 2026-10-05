const crypto=require('crypto');
function hash(obj){return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex')}
function createSecurityProof({name,build,checks,evidence=[]}){
  const normalized=checks.map(c=>({name:c.name,passed:!!c.passed,details:c.details||''}));
  const proof={name,build,createdAt:new Date().toISOString(),checks:normalized,evidence,passed:normalized.every(c=>c.passed)};
  proof.digest=hash(proof);
  return proof;
}
module.exports={createSecurityProof,hash};
