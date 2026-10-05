# Ethical Hacker v1.3.1

Authorized defensive validation platform core for software and AI systems.

## Added in v1.1
- Trust, authority, scope, provenance, overload and memory-integrity invariants
- Attack/state graph and blast-radius analysis
- Attack-chain discovery
- Policy-as-code rules
- Evidence-oriented security proofs with SHA-256 digests
- Release security diffing
- CI/CD-style build gate (PASS/BLOCK)
- Safe synthetic simulations for trust laundering, authority drift, scope escape and overload
- Dependency-free HTTP API and lightweight dashboard

## Run
```bash
npm test
npm run stress
npm run demo
npm run serve
```
Open `http://localhost:8787` after starting the server.

## Defensive boundary
This project is designed for systems you own or are explicitly authorized to test. The included simulation layer uses synthetic transitions rather than performing live exploitation.

## v1.2 — Real-project connectors + future-proofing

v1.2 adds a plugin-style connector layer and a local filesystem project scanner. It can derive a security graph from a real codebase without sending source code anywhere.

Detected today:
- Next.js API routes
- Supabase usage and RLS indicators
- service-role and secret references
- AI/agent SDK indicators
- MCP/tool-protocol indicators
- dependency inventory
- environment-variable references
- selected runtime execution surfaces
- evidence hashes for replay/provenance

Run:

```bash
npm test
node cli.js scan /path/to/project
node cli.js connectors
npm run serve
```

### Future-proof architecture
- Connectors are registered dynamically rather than hard-coded into the core.
- Scan results use versioned envelopes (`schemaVersion`) and immutable SHA-256 evidence hashes.
- Security-framework mappings live in `standards/registry.json`, so OWASP/NIST/MITRE revisions can be updated as data.
- Unknown connector-specific data can travel in `extensions` instead of breaking the core schema.
- Major schema changes explicitly require migration; same-major versions remain compatible.
- Raw evidence provenance is retained so future detectors can replay old scans against new rules.

The scanner is intentionally passive: it analyzes code/configuration supplied by the owner and does not probe external systems.

## v1.3 — Discover → Model → Attack → Observe → Prove → Gate

New defensive capabilities:
- Adaptive synthetic adversarial campaigns with canary markers
- OpenTelemetry-style GenAI/tool trace ingestion
- Canary detection/prevention verification
- Differential security regression analysis
- SARIF export for CI/code-scanning workflows
- Expanded CLI build-gate workflow
- Local-first operation; no external runtime dependencies

Examples:
```bash
npm test
npm run stress
npm run campaign -- 6
npm run gate -- /path/to/project
node cli.js scan /path/to/project
node cli.js diff before.json after.json
```


## v1.3.1 real-project validation patch
- Detects local AI subsystems even without external model SDKs.
- Distinguishes empty `.env.example` service-role placeholders from real secret references.
- Builds API→service edges from file-level evidence instead of project-wide inference.
- `sarif` accepts either findings JSON or a project folder.
- Validated against Fluxo v0.6 core-hardening build.
