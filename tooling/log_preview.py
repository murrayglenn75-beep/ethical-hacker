"""Evidence-preserving log previews; never replace original CI evidence."""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass

IMPORTANT = re.compile(r"(?i)(error|fatal|fail(?:ed|ure)?|exception|traceback|security|denied|unauthoriz|vulnerab|critical|warning|\bwarn\b)")
MAX_LINES = 100_000

@dataclass(frozen=True)
class LogPreview:
    preview: str
    sha256: str
    original_lines: int
    retained_lines: int
    omitted_lines: int
    original_bytes: int


def reduce_log(data: bytes, *, head: int = 12, tail: int = 12, max_preview_lines: int = 400) -> LogPreview:
    """Only produce a compact view when every security/error line fits; otherwise fail closed."""
    if any(not isinstance(v, int) or isinstance(v, bool) or v < 0 for v in (head, tail, max_preview_lines)):
        raise ValueError("invalid limits")
    if len(data) > 20_000_000:
        raise ValueError("log too large; retain raw evidence without reducing")
    text = data.decode("utf-8", errors="replace")
    lines = text.splitlines()
    if len(lines) > MAX_LINES:
        raise ValueError("too many lines; retain raw evidence without reducing")
    chosen = set(range(min(head, len(lines))))
    chosen.update(range(max(0, len(lines) - tail), len(lines)))
    chosen.update(i for i, line in enumerate(lines) if IMPORTANT.search(line))
    if len(chosen) > max_preview_lines:
        raise ValueError("critical lines exceed preview budget; use complete raw log")
    view = []
    prev = -1
    for i in sorted(chosen):
        if i > prev + 1:
            view.append(f"[omitted original lines {prev + 2}-{i}]")
        view.append(f"L{i + 1}: {lines[i]}")
        prev = i
    if prev < len(lines) - 1:
        view.append(f"[omitted original lines {prev + 2}-{len(lines)}]")
    return LogPreview(
        preview="\n".join(view),
        sha256=hashlib.sha256(data).hexdigest(),
        original_lines=len(lines),
        retained_lines=len(chosen),
        omitted_lines=len(lines) - len(chosen),
        original_bytes=len(data),
    )
