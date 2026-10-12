# Detector benchmark methodology

Run the labeled synthetic detector smoke suite:

```bash
node tests/benchmark-detectors.js
```

This suite creates isolated disposable projects and checks explicit positive and negative assertions for hard-coded service-role references, dynamic execution, raw HTML surfaces, empty example environment variables, environment references, and ordinary source code.

**Interpretation:** Results are synthetic smoke assertions only. The reported recall is recall over *labeled positive assertions*, **not** estimated real-world vulnerability recall. The suite reports false-positive assertions only for explicitly labeled negatives. Other findings are not automatically classed as false positives, so a conventional precision score would be misleading.

## Next evidence gate

1. Collect a versioned set of real vulnerable open-source repositories or established challenge fixtures, with exact vulnerable commits.
2. Establish ground truth independently, including relevant paths, rule category, confirmed exploitability and clean controls.
3. Compare under a reproducible scanner version against Semgrep and CodeQL on identical snapshots.
4. Publish confusion matrix (TP/FP/FN/TN where defined), precision, recall, setup time, scan time and noise per scanned file.
5. Preserve missed findings and false positives in a regression corpus.
6. Do not claim better detection than a competitor based on the smoke suite.

This benchmark does not exercise networks or exploit third-party services.
