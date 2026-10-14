# Docker-isolated repair verification — experimental/manual

This runner extends the prior Git worktree pilot with Docker isolation for test execution. It does **not** generate patches, connect to an AI model, open PRs, merge or deploy.

Prerequisites: trusted local Git repository and a reviewed patch; Docker installed and running; a vetted Python image pulled and pinned by digest. The runner does not pull the image itself. Example:

```bash
export REPAIR_DOCKER_IMAGE_DIGEST='python@sha256:<VERIFIED_64_HEX_DIGEST>'
python tooling/docker_repair_verifier.py --repo /path/to/repo \
  --handoff repair-handoff.json --patch reviewed.diff --output evidence.json
```

Restrictions applied: network none, read-only filesystem and repository mount, dropped Linux capabilities, no-new-privileges, nonroot UID, PID/memory/CPU limits, no Docker socket mount, constrained temporary filesystem, 120-second process timeout. Source patch applied to a detached temporary Git worktree; tests are executed only inside the container. On completion the worktree is removed. It records SHA-256, changed paths, baseline commit and result.

Security caveats: this is **not production-grade sandbox assurance**. Docker engine itself, local host privileges and bind-mount path resolution are trusted; the script's patch filter is incomplete for adversarial diffs (including symlinks and crafted Git metadata); test results may contain sensitive source/output excerpts; no runtime integration or real Docker smoke test has yet been independently verified. Use only with trusted inputs in a private, disposable environment. Never expose this runner to untrusted issue text or automatically activate it from workflow_run. Before unattended use require stronger OS/VM boundary, signed evidence, verified image provenance, cleanup tests under crash and timeout, policy-based path authorization and zero-secret host credentials.

GitHub CI currently verifies construction of hardening flags and unit behavior; it does not establish that Docker isolation is exploit-resistant.
