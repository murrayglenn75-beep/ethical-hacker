# Experimental code graph evidence audit

The standalone `core/graph-evidence.js` audit is an optional and non-authoritative analysis layer over graph JSON. It does not modify scanner decisions, configure Graphify, or send source code to external services.

Run `npm test` to execute `tests/graph-evidence.js` alongside existing tests.

- `EXTRACTED` is accepted **only when** an input edge explicitly claims extracted provenance and supplies a nonempty source path and positive line number. This is a structural check, not proof that the source file actually supports the edge.
- All other edges are `UNVERIFIED`, including inferred edges or missing provenance.
- Duplicate nodes, invalid nodes, dangling edges invalidate the audit.
- The SHA-256 graph digest is a deterministic checksum and not an authenticity signature.

Next gated experiment: independently parse source with an AST, verify edge locations against repository files at a pinned commit, compare graph queries against a hand-labelled truth set, measure precision/recall, CPU/RAM, build time and changes in debugging outcomes. No automatic hook installs, external graph exports or production merge gates without approval.

Safety: avoid indexing secrets, credentials or private documents. Any future external Neo4j/MCP integration must pass AAK authorization.
