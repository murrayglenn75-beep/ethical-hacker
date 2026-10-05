#!/usr/bin/env bash
set -euo pipefail

printf '\n== Ethical Hacker v1.3.1 :: Git Bash setup ==\n\n'

if ! command -v node >/dev/null 2>&1; then
  echo 'ERROR: Node.js is not installed or not on PATH.'
  echo 'Install a current Node.js LTS release, reopen Git Bash, then rerun this script.'
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo 'ERROR: npm is not available on PATH.'
  exit 1
fi

printf 'Node: '; node --version
printf 'npm:  '; npm --version
printf '\nNo npm install is required: v1.3.1 has no external runtime dependencies.\n\n'

echo 'Running deterministic tests...'
npm test

echo
echo 'Running stress tests...'
npm run stress

echo
echo 'Running demo...'
npm run demo

echo
printf 'Setup complete.\n'
printf 'Start the dashboard with: npm run serve\n'
printf 'Then open: http://localhost:8787\n'
printf 'Scan a project with: npm run scan -- /c/path/to/your/project\n\n'
