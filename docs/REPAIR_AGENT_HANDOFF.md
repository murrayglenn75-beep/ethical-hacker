# Isolated repair-agent handoff (proposal-only)

The triage output can be converted into a constrained agent handoff:

```bash
python tooling/repair_handoff.py repair-plan.json repair-handoff.json
```

The handoff includes a deterministic `repair/<fingerprint>` branch name, an explicit Git-worktree isolation requirement, evidence separated as untrusted data, and a mandatory review boundary. It **does not invoke an agent, create a Git worktree, execute the patch, push a branch or open a PR**.

To use it with Codex or another coding agent: a human/operator must establish a worktree using Git, supply only repository-scoped permissions, and review the resulting patch and test outputs. Protected-path edits require the full suite and independent approval; CI must not promote knowledge from a proposed or failed fix.

Future runner integration must include workload identity, bounded filesystem/network permissions, changeset verification, comprehensive logging, timeouts and cleanup. Avoid granting write credentials to event-triggered workflows.
