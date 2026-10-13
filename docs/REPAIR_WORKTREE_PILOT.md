# Worktree patch verification (manual-only experimental runner)

The patch verifier is **not a sandbox** and **does not generate patches**. It is a manual CLI used only on trusted/local code with reviewed patches. It never pushes, commits, opens PRs, merges, deploys or runs AI tools.

To run from this repository with an approved handoff and a reviewed unified diff:

```bash
python tooling/repair_worktree_runner.py --repo /path/to/clean/repo --handoff repair-handoff.json --patch proposed.diff --output repair-evidence.json
```

The runner checks explicit proposal-only authorization fields, validates basic diff framing/path traversal restrictions, creates a detached temporary Git worktree, uses `git apply --check`, applies the patch in that worktree, runs a fixed `python -m unittest discover -s tests -v` test profile, records patch SHA-256 and test exit code, and removes the temporary worktree.

**Security boundaries:** Git worktrees isolate edits, not processes. Tests from an untrusted branch can execute arbitrary code with the runner's operating-system permissions, read user files and access the network. Therefore DO NOT run the pilot against untrusted PRs or third-party repositories; do not schedule unattended runs. A production runner requires hardened container/VM sandboxing, network/secret isolation, CPU/memory/time budgets, canonical path checks including symlink/submodule escapes, complete binary/rename handling, independent approval of executable test profiles, and durable evidence. This pilot's diff validator is not a complete patch parser.

Risk-scoped full regression, vulnerability scanning, architecture review and independent AAK enforcement are not yet integrated. The workflow's PR remains draft and requires review. Verified-success WikiSkill promotion is out of scope until a trusted outcome verifier exists.
