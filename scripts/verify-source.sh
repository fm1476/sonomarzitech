#!/usr/bin/env bash
set -euo pipefail

echo "SonoMarzi source verification"

test -f frontend/index.html
test -f lambdas/api/index.mjs
test -f lambdas/api/core.mjs
test -f lambdas/api/apply-changes.mjs
test -f lambdas/api/field-training.mjs
test -f lambdas/api/staff-notices.mjs
test -f lambdas/api/audit.mjs
test -f lambdas/api/tenant-admin.mjs
test -f lambdas/api/workflows.mjs
test -f lambdas/api/lib/agency-subdomains.mjs
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

for file in lambdas/api/*.mjs lambdas/api/lib/*.mjs lambdas/identity-admin/*.mjs; do
  node --check "$file"
done

# Browser files still benefit from Node's parser. This catches syntax errors before
# a deployment even when the code references DOM/browser globals at runtime.
for file in frontend/assets/js/*.js frontend/assets/js/modules/*.js; do
  node --check "$file"
done

node scripts/verify-role-invariants.mjs
node scripts/verify-attachment-invariants.mjs
node scripts/verify-mfa-invariants.mjs
node scripts/verify-scheduling-access.mjs
node scripts/verify-organizational-access.mjs
node scripts/verify-organization-assignments.mjs
node scripts/verify-organizational-access-admin.mjs
node scripts/verify-organizational-access-ui.mjs
node scripts/verify-workspace-template.mjs
node scripts/verify-workspace-identity-scope.mjs
node scripts/verify-personnel-org-scope.mjs
node scripts/verify-field-training-org-scope.mjs
node scripts/verify-scheduling-api.mjs
node scripts/verify-scheduling-module.mjs
node scripts/verify-dashboard-navigation.mjs

if grep -R -n --include='*.mjs' --include='*.js' 'rejectUnauthorized:[[:space:]]*false' lambdas frontend; then
  echo "ERROR: Database TLS certificate verification must not be disabled."
  exit 1
fi

if ! grep -q 'us-east-2-bundle.pem' lambdas/api/core.mjs; then
  echo "ERROR: API database connection is not pinned to the packaged RDS CA bundle."
  exit 1
fi

node scripts/verify-shift-bids.mjs
node scripts/verify-special-event-assignments.mjs
node scripts/verify-staffing-categories.mjs
node tests/civil-jurisdiction-profiles.test.js
node tests/civil-jurisdiction-integration.test.mjs

node tests/civil-test-validation.test.mjs
node tests/civil-test-api.test.mjs

node tests/civil-jurisdiction-view.test.mjs

node tests/civil-california-domain.test.mjs
node tests/civil-california-api.test.mjs
node tests/civil-california-refresh.test.mjs
node tests/civil-california-release-controls.test.mjs
node tests/civil-california-enforcement-forms.test.mjs
node tests/civil-california-form-preparation.test.mjs


echo "Source checks passed."
