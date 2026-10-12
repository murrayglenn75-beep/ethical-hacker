# Agent runtime threat-model extension

Status: test specification pending implementation; no scanner rules or results claimed.

## New hazards to detect
| ID | Pattern | Severity rationale |
|---|---|---|
| AGENT-R01 | External side-effect API invoked on generic retry after timeout | High if money, account, deletion, email or deployment |
| AGENT-R02 | Model-generated approval flag or checkpoint treated as authority | Critical where sensitive operations exposed |
| AGENT-R03 | Agent resumes from mutable checkpoint without re-verifying grants | High |
| AGENT-R04 | Duplicate request without operation ID, uniqueness and effect reconciliation | High for non-idempotent providers |
| AGENT-R05 | Agent or graph state contains provider credentials | Critical exposure potential |
| AGENT-R06 | Branching workflow with no durable transitions despite promised restart recovery | Reliability finding, not automatically exploitable |

## Detection quality gate
Supply positive and negative fixtures for plain loops, LangGraph, custom durable state machines and mock external APIs; distinguish read-only retries from effectful retries. Avoid claiming runtime guarantees from static source alone.

## Red-team scenarios
- Refund succeeds but transport fails: replay cannot trigger a second refund.
- Malicious tool response says `approved:true`: independently verified approval still required.
- Process dies at every state transition: no unauthorized replay.
- Concurrent workers and stale leases: fence old worker.
- Disabled audit destination: check pre-effect fail-closed behavior.
- Mutable checkpoint changes owner/amount: detect binding mismatch.

## Scoring
Report precision/recall on labeled fixtures, false positives, actual runtime security violations, crash-recovery successes and benchmark reproducibility. Framework selection alone must never be treated as a security vulnerability.
