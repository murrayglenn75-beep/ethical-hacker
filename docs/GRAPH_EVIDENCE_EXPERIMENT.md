# Experimental code graph evidence audit

The standalone `core/graph-evidence.js` audit is an optional and non-authoritative analysis layer over graph JSON. It does not modify scanner decisions, configure Graphify, or send source code to external services.

Run `npm test` to execute `tests/graph-evidence.js` alongside existing tests.

- `EXTRACTED` is accepted **only when** an input edge explicitly claims extracted provenance and supplies a nonempty source path and positive line number. This is a structural check, not proof that the source file actually supports the edge.
- All other edges are `UNVERIFIED`, including inferred edges or missing provenance.
- Duplicate nodes, invalid nodes, dangling edges invalidate the audit.
- The SHA-256 graph digest is a deterministic checksum and not an authenticity signature.

Next gated experiment: independently parse source with an AST, verify edge locations against repository files at a pinned commit, compare graph queries against a hand-labelled truth set, measure precision/recall, CPU/RAM, build time and changes in debugging outcomes. No automatic hook installs, external graph exports or production merge gates without approval.

Safety: avoid indexing secrets, credentials or private documents. Any future external Neo4j/MCP integration must pass AAK authorization.

## Reproducible synthetic comparison

Run `npm run benchmark:graph`. This deliberately small four-file example checks transitive graph reachability versus **single-file** text search, with four labelled yes/no queries. A local Node 22.16.0 run produced graph 4/4 and single-file 3/4. These are synthetic correctness checks, not project precision/recall, AST extraction, performance results or a fair comparison against recursive repository search. Graph edges are manually supplied; they have NOT been independently verified against the linked source files.

The current GitHub CI outcome for this latest benchmark commit remains unverified. Before adoption, independently build a pinned-commit AST graph and evaluate on real labelled repository dependency questions. Keep measured speed, memory, accuracy and reviewer usefulness separate from fixture results.
