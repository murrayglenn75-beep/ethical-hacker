"""Conservative repository change-impact contract; no automatic authorization."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import PurePosixPath


@dataclass(frozen=True)
class Impact:
    changed: tuple[str, ...]
    related: tuple[str, ...]
    suggested_tests: tuple[str, ...]
    requires_manual_review: bool


def analyze(changed: list[str], dependency_graph: dict[str, list[str]], tests: dict[str, list[str]]) -> Impact:
    """Traverse reverse dependencies; unknown graph nodes fail closed."""
    if not changed or len(changed) > 1000:
        raise ValueError("invalid changed-file count")
    all_nodes = set(dependency_graph)
    for deps in dependency_graph.values():
        all_nodes.update(deps)
    all_nodes.update(tests)
    def safe(p: str) -> bool:
        q = PurePosixPath(p)
        return bool(p) and not q.is_absolute() and ".." not in q.parts and "\\" not in p and p == q.as_posix()
    if any(not safe(p) for p in all_nodes | set(changed)):
        raise ValueError("unsafe repository path")
    reverse: dict[str, set[str]] = {}
    for importer, dependencies in dependency_graph.items():
        for dependency in dependencies:
            reverse.setdefault(dependency, set()).add(importer)
    seen = set(changed)
    queue = list(changed)
    while queue:
        for parent in reverse.get(queue.pop(), ()):
            if parent not in seen:
                seen.add(parent)
                queue.append(parent)
    suggested = {t for path in seen for t in tests.get(path, ())}
    if any(not safe(t) for t in suggested):
        raise ValueError("unsafe test path")
    # This graph is caller-supplied, not an independent source parser.
    return Impact(tuple(sorted(changed)), tuple(sorted(seen - set(changed))),
                  tuple(sorted(suggested)), any(p not in all_nodes for p in changed))
