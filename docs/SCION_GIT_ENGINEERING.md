# Scion-inspired Git change gates
Run `python tooling/scion_git_gates.py --base origin/master --head HEAD`.
This prints a conservative result: FULL for security-sensitive files, unknown/empty diffs; TARGETED_PLUS_REQUIRED_BASELINE otherwise. Baseline test gates always run. This code only reads local Git data.
Isolate agents with native Git worktrees: `git worktree add ../repo-agent1 -b agent/task1 master`. Review changes before merge. Cache only reproducible artifacts keyed by dependency lockfile and tool versions; do not cache credentials.
No claim of Scion equivalence, sandboxing, or automatic merge safety. FORGE and APEX integrations require their source repos.
