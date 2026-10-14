"""Query-aware log previews preserving critical evidence and original bytes."""
from __future__ import annotations

import re
from dataclasses import dataclass

from tooling.log_preview import IMPORTANT, reduce_log


@dataclass(frozen=True)
class Selection:
    preview: str
    retained: tuple[int, ...]
    critical_total: int
    critical_retained: int
    sha256: str
    original_lines: int


def select(data: bytes, query: str, *, budget: int = 40) -> Selection:
    """Never suppress a critical line. Return source indices, not rewritten log lines."""
    if not isinstance(query, str) or not query.strip() or len(query) > 1000:
        raise ValueError("query required")
    if type(budget) is not int or budget < 1:
        raise ValueError("invalid budget")
    # Apply existing size and count protections, with fail-closed critical retention.
    baseline = reduce_log(data, head=0, tail=0, max_preview_lines=100_000)
    lines = data.decode("utf-8", errors="replace").splitlines()
    critical = {i for i, line in enumerate(lines) if IMPORTANT.search(line)}
    if len(critical) > budget:
        raise ValueError("critical lines exceed context budget")
    words = set(re.findall(r"[a-z0-9_./-]{3,}", query.lower()))
    matches = [(sum(word in line.lower() for word in words), -i, i)
               for i, line in enumerate(lines) if i not in critical]
    selected = set(critical)
    for score, _, index in sorted(matches, reverse=True):
        if len(selected) >= budget or score == 0:
            break
        selected.add(index)
    preview_lines = []
    previous = -1
    for index in sorted(selected):
        if index > previous + 1:
            preview_lines.append(f"[omitted original lines {previous + 2}-{index}]")
        preview_lines.append(f"L{index + 1}: {lines[index]}")
        previous = index
    if previous < len(lines) - 1:
        preview_lines.append(f"[omitted original lines {previous + 2}-{len(lines)}]")
    return Selection("\n".join(preview_lines), tuple(sorted(selected)), len(critical),
                     len(critical & selected), baseline.sha256, baseline.original_lines)
