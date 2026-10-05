const crypto=require('crypto');
function createCanary(prefix='EH'){
  return `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}
function verifyCanary({marker,events=[]}){
  const hits=events.filter(e=>JSON.stringify(e).includes(marker));
  const detected=hits.some(e=>e.detected===true||/detect|alert|block/i.test(String(e.kind||e.event||'')));
  const prevented=hits.some(e=>e.prevented===true||/block|deny|prevent/i.test(String(e.outcome||e.kind||'')));
  return {marker,hits:hits.length,detected,prevented,evidence:hits};
}
module.exports={createCanary,verifyCanary};
