// Convert an AAK JUnit failure report into bounded, evidence-only findings.
// No model inference, execution, external requests, or automated patching.
const fs = require('node:fs');

function convert(report) {
  if (!report || report.schema !== 'engineering.failure-report.v1' ||
      !Array.isArray(report.failures) || report.failures.length > 100)
    throw new Error('invalid_failure_report');
  return {
    schema: 'ethical-hacker.evidence-findings.v1',
    source: String(report.source || '').slice(0, 512),
    findings: report.failures.map((f, i) => {
      if (!f || !['error', 'failure'].includes(f.kind) ||
          typeof f.test !== 'string' || typeof f.evidence !== 'string' ||
          f.test.length > 512 || f.evidence.length > 1200)
        throw new Error('invalid_failure_entry');
      return { id: 'test-failure-' + (i + 1), kind: f.kind,
        test: f.test, observation: f.evidence,
        root_cause: 'unverified', confidence: 'not_assessed',
        requires_reproduction: true, status: 'evidence_only' };
    })
  };
}
if (require.main === module) {
  try {
    const file = process.argv[2];
    if (!file || fs.statSync(file).size > 5_000_000) throw new Error('missing_or_large_file');
    process.stdout.write(JSON.stringify(convert(JSON.parse(fs.readFileSync(file, 'utf8'))), null, 2) + '\n');
  } catch (err) {
    process.stderr.write(String(err.message) + '\n');
    process.exitCode = 2;
  }
}
module.exports = { convert };
