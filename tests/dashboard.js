const assert=require('assert');
const path=require('path');

const {
  server,
  dashboardStatus,
  currentGate
}=require('../api/server');

const root=path.join(__dirname,'..');

let passed=0;

function test(name,fn){
  try{
    fn();
    passed++;
    console.log('PASS',name);
  }catch(e){
    console.error('FAIL',name,e.stack||e.message);
    process.exitCode=1;
  }
}

test('dashboard starts not scanned',()=>{
  const s=dashboardStatus();

  assert.equal(s.scanned,false);
  assert.equal(s.gate.status,'NOT_SCANNED');
  assert.ok(
    s.gate.reasonCodes.includes('NOT_SCANNED')
  );
});

test('current gate starts not scanned',()=>{
  const g=currentGate();

  assert.equal(g.status,'NOT_SCANNED');
  assert.equal(g.blocking.total,0);
});

async function request(port,method,url,body){
  const res=await fetch(
    `http://127.0.0.1:${port}${url}`,
    {
      method,
      headers:body
        ?{'content-type':'application/json'}
        :undefined,
      body:body
        ?JSON.stringify(body)
        :undefined
    }
  );

  return {
    status:res.status,
    json:await res.json()
  };
}

async function runHttpTests(){
  await new Promise((resolve,reject)=>{
    server.listen(0,'127.0.0.1',resolve);
    server.once('error',reject);
  });

  try{
    const port=server.address().port;

    let r=await request(
      port,
      'GET',
      '/api/status'
    );

    assert.equal(r.status,200);
    assert.equal(r.json.scanned,false);
    assert.equal(
      r.json.gate.status,
      'NOT_SCANNED'
    );

    console.log(
      'PASS API status starts not scanned'
    );
    passed++;

    r=await request(
      port,
      'POST',
      '/api/scan-project',
      {
        path:root,
        includeTests:false,
        includeFixtures:false,
        all:false
      }
    );

    assert.equal(r.status,200);
    assert.equal(r.json.ok,true);

    assert.equal(
      r.json.scan.scope.testsIncluded,
      false
    );

    assert.equal(
      r.json.scan.scope.fixturesIncluded,
      false
    );

    assert.ok(
      r.json.scan.scope.excluded.some(
        x=>x.path==='tests'&&x.reason==='test'
      )
    );

    assert.ok(
      r.json.scan.scope.excluded.some(
        x=>x.path==='fixtures'&&x.reason==='fixture'
      )
    );

    console.log(
      'PASS API default scan excludes tests and fixtures'
    );
    passed++;

    r=await request(
      port,
      'GET',
      '/api/status'
    );

    assert.equal(r.status,200);
    assert.equal(r.json.scanned,true);
    assert.ok(r.json.scannedAt);
    assert.equal(
      path.resolve(r.json.projectPath),
      path.resolve(root)
    );

    assert.notEqual(
      r.json.gate.status,
      'NOT_SCANNED'
    );

    console.log(
      'PASS API status persists latest scan'
    );
    passed++;

    r=await request(
      port,
      'GET',
      '/api/latest-scan'
    );

    assert.equal(r.status,200);
    assert.ok(r.json.scan);
    assert.ok(r.json.scannedAt);

    console.log(
      'PASS latest scan endpoint returns persisted scan'
    );
    passed++;

  }finally{
    await new Promise(resolve=>
      server.close(resolve)
    );
  }
}

runHttpTests()
  .then(()=>{
    console.log(
      `\n${passed}/6 dashboard/API tests passed`
    );

    if(passed!==6){
      process.exitCode=1;
    }
  })
  .catch(e=>{
    console.error(
      'FAIL dashboard/API test runner',
      e.stack||e.message
    );
    process.exitCode=1;

    try{
      server.close();
    }catch{}
  });
