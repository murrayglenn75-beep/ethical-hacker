"""Reproducible synthetic log preview comparison; byte/line counts, not token claims."""
from __future__ import annotations

import json
from dataclasses import asdict

from tooling.log_preview import reduce_log
from tooling.query_log_selection import select


def benchmark(data: bytes, query: str, *, budget: int = 40) -> dict[str, object]:
    original_lines = data.decode("utf-8", errors="replace").splitlines()
    base = reduce_log(data, head=2, tail=2)
    selected = select(data, query, budget=budget)
    return {
        "input_sha256": selected.sha256,
        "original_bytes": len(data),
        "original_lines": len(original_lines),
        "baseline_preview_bytes": len(base.preview.encode("utf-8")),
        "baseline_retained_lines": base.retained_lines,
        "query_preview_bytes": len(selected.preview.encode("utf-8")),
        "query_retained_lines": len(selected.retained),
        "critical_total": selected.critical_total,
        "critical_retained": selected.critical_retained,
        "critical_missed": selected.critical_total - selected.critical_retained,
        "query_retention_ratio": len(selected.retained) / len(original_lines) if original_lines else 1.0,
        "mode": "synthetic, lexical selector; no model, no tokenizer",
    }


if __name__ == "__main__":
    example = ("startup\n" + "uninformative progress\n" * 70
               + "CRITICAL: authorization bypass detected\n"
               + "network timeout investigation\n"
               + "done\n").encode()
    print(json.dumps(benchmark(example, "network timeout", budget=8), indent=2, sort_keys=True))
