# Query-aware context-selection pilot

Deterministic, CPU-only comparison candidate for existing `tooling/log_preview.py`. It uses lexical relevance for non-critical lines and always retains all lines matching the existing IMPORTANT matcher. It refuses a budget that would drop any recognized critical line. Original bytes are never changed; SHA-256 and exact line indices are returned.

**Limitations:** This is **not** Caveman trim-1 and no trim-1 model was executed. The existing IMPORTANT regex is heuristic and can miss semantically important lines without keywords; text decoding replacement may affect display of invalid UTF-8. There is no independently labelled log benchmark, no tokenization-based cost study and no downstream agent-quality measurements. Metrics must use original source bytes, not character count alone.

Acceptance before integration: curated security findings with hard-to-detect evidence, zero critical false negatives, matched baseline/query-aware/full-context comparisons, p50/p95 latency, tokenizer-based reduction, verified retrievability of omitted lines, adversarial prompt-injection tests and no modification to audit trails. Never enable automatic replacement of raw security evidence.
