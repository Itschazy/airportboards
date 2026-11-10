#!/bin/sh
set -eu
# Run from the repository root with Node 22 on PATH. No production flight API.
audit_dir=ops/guide-reaudit-20261110
node scripts/check-guide-fresh.mjs > "$audit_dir/check-guidefresh.log"
node scripts/check-guide-fresh-regressions.mjs > "$audit_dir/check-regressions.log"
node scripts/check-scripts.mjs > "$audit_dir/check-scripts.log"
node scripts/check-guide-scripts.mjs > "$audit_dir/check-guide-scripts.log"
node scripts/check-json-ld.mjs > "$audit_dir/check-jsonld.log"
git diff --check
