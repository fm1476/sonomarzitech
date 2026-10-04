#!/usr/bin/env bash
set -euo pipefail

echo "SonoMarzi source verification"

test -f frontend/index.html
test -f lambdas/api/index.mjs
test -f lambdas/api/domains/field-training.mjs
test -f lambdas/api/domains/staff-notices.mjs
test -f lambdas/api/domains/audit-log.mjs
test -f lambdas/api/domains/tenant-admin.mjs
test -f lambdas/api/domains/workflows.mjs
test -f lambdas/identity-admin/index.mjs
test -f frontend/assets/js/custom-auth.js
test -f frontend/assets/js/aws-auth-bridge.js

if grep -qi "netlify" frontend/index.html; then
  echo "ERROR: Netlify reference found in production frontend."
  exit 1
fi

if grep -qi "This login demonstrates the concept" frontend/index.html; then
  echo "ERROR: Prototype-only login disclaimer found in production frontend."
  exit 1
fi

if ! grep -q 'assets/js/custom-auth.js' frontend/index.html; then
  echo "ERROR: Custom Cognito auth script is not linked."
  exit 1
fi

echo "Checking JavaScript module syntax..."
find lambdas -type f -name '*.mjs' -print0 | while IFS= read -r -d '' file; do
  node --check "$file"
done

echo "Source checks passed."
