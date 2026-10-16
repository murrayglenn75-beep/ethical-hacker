const assert = require('node:assert/strict');
const test = require('node:test');
const { convert } = require('../core/aak-failure-import');
test('imports an observed test failure as evidence only', () => {
  const findings = convert({schema:'engineering.failure-report.v1',source:'junit.xml',
    failures:[{kind:'failure',test:'x.y',evidence:'expected 1'}]});
  assert.equal(findings.findings[0].root_cause,'unverified');
  assert.equal(findings.findings[0].requires_reproduction,true);
});
test('rejects arbitrary schemas', () => {
  assert.throws(() => convert({schema:'other',failures:[]}),/invalid_failure_report/);
});
test('rejects invalid evidence content', () => {
  assert.throws(() => convert({schema:'engineering.failure-report.v1',
    failures:[{kind:'error',test:'a',evidence:9}]}),/invalid_failure_entry/);
});
test('never trusts upstream root cause', () => {
  const out=convert({schema:'engineering.failure-report.v1',
    failures:[{kind:'error',test:'a',evidence:'bad',root_cause:'definitely X'}]});
  assert.equal(out.findings[0].root_cause,'unverified');
});
