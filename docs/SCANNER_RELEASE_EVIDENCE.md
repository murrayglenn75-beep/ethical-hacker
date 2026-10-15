# Scanner maturity and release evidence

## Reproduce (Node 22)
```bash
npm test
node benchmarks/test-benchmark.js
node benchmarks/benchmark.js
npm run scan -- .
```

The benchmark uses five fully disclosed, **synthetic, author-labelled engine transition fixtures**; its perfect scores, if obtained, demonstrate implementation/fixture consistency only and **must not be advertised as field precision, false-positive rates or attack coverage**. This does not benchmark the filesystem-project scanner or real repositories.

## Honest release gate
- [ ] Fresh Windows Git Bash installation and documented versioned artifact verified
- [ ] Linux and Windows test runs, plus archive checksums
- [ ] Permissioned real-project ground-truth dataset with independent human labels; recall, precision and false positives reported by domain
- [ ] Negative and adversarial repository corpus: polyglot files, absent files, false-positive lookalikes, oversized projects, symlinks and malformed paths
- [ ] SARIF schema validation and consumption by external tooling
- [ ] Upgrade/rollback documented; new release tagged only after gates pass
- [ ] Independently reviewed threats, exclusions and limitations published

No release is created by this PR. No proof of real-world detection effectiveness is claimed. Trivy is a distribution/release-discipline reference, not evidence of parity.
