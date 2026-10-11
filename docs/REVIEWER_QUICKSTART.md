# Reviewer quick start — Ethical Hacker

**Purpose:** Evaluate a defensive codebase scanner by reproducible local behavior, explained findings and false-positive controls.

## Reproduce documented checks

From the repository root on a compatible Node.js/npm environment:

```bash
npm test
npm run serve
```

Then open `http://127.0.0.1:8787`.

For a local project you own or are authorized to inspect, the README documents:

```bash
npm run scan -- /path/to/project
npm run gate -- /path/to/project
```

Consult the [README](../README.md) for command options and current requirements.

## Evidence to inspect

- Input project → discovered architecture graph → attack paths and contextual findings.
- Provenance and confidence for each finding, especially rules that affect `PASS / WARN / FAIL`.
- SARIF emission and differential regression behavior.
- False-positive handling, fixture exclusion and scanner self-analysis.
- CI status on the exact inspected commit.

## Scope and limitations

The scanner is intended for **authorized defensive analysis**. It is not an independent security certification, proof of exploitability for each flagged path, or a substitute for code review and hands-on security testing. The dashboard runs locally; do not expose its service publicly without a separate security review.

## Suggested reviewer questions

1. Which risky relationships can the graph detect that file-by-file checks miss?
2. What evidence elevates a contextual observation to a release-blocking finding?
3. What attacks and programming languages are outside current coverage?
4. Does a clean scan mean only “no supported findings detected” rather than “secure”?
