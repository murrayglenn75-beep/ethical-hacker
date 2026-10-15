const assert=require('node:assert/strict');
const {measure}=require('./benchmark');
const report=measure();
assert.equal(report.fixture_count,5);
assert.equal(report.tp,5);
assert.equal(report.fp,0);
assert.equal(report.fn,0);
assert.equal(report.exact_case_accuracy,1);
console.log('PASS labelled synthetic rule-benchmark reproduction');
