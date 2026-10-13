# Guarded issue-to-fix triage pilot
Input: local JSON with `schema_version: 1`, `kind: ci_failure|bug|security_finding`, `title`, `evidence`, and `paths` array.
Run: `python tooling/repair_triage.py --input failure.json --output repair-plan.json`.
The output is deterministic evidence-linked **investigation guidance**, not autonomous remediation. No shell, tool invocation, provider calls, GitHub issue mutations, patch writes, commits, merges or deployments occur. Untrusted logs are data.
Always investigate in an isolated worktree. Human review is required before patch merge, all protected files require full security tests, and only independently verified successful repairs may inform WikiSkill knowledge promotion.
Future FORGE/APEX integration should consume this schema without assuming that a reported failure is authentic or that a suggested fix is safe.
