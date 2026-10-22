#!/usr/bin/env bash
# Controlled API-only deployment. Does not merge, migrate, or activate rollout.
set -euo pipefail
export AWS_REGION=us-east-2 AWS_PAGER=""
revision="${1:?Pass the reviewed full commit SHA}"
[[ "$revision" =~ ^[0-9a-f]{40}$ ]] || { echo 'A full commit SHA is required.'; exit 1; }
test "$(aws sts get-caller-identity --query Account --output text)" = '458826002208'
backup_path=$(cat "$HOME/sonomarzi-pr163-backup-path")
test -s "$backup_path/sonomarzi-api-dev.zip"
build_dir=$(mktemp -d /tmp/sonomarzi-pr163-api.XXXXXX)
git clone --quiet https://github.com/fm1476/sonomarzitech.git "$build_dir/source"
cd "$build_dir/source"
git checkout --quiet --detach "$revision"
test "$(git rev-parse HEAD)" = "$revision"
bash scripts/verify-source.sh
mkdir -p dist lambdas/api/certs
curl --fail --silent --show-error --location \
  https://truststore.pki.rds.amazonaws.com/us-east-2/us-east-2-bundle.pem \
  -o lambdas/api/certs/us-east-2-bundle.pem
test -s lambdas/api/certs/us-east-2-bundle.pem
(cd lambdas/api && npm ci --omit=dev --no-audit --no-fund && zip -qr ../../dist/api.zip .)
# Preserve the immediately preceding API package as well as the original backup.
umask 077
aws lambda get-function --function-name sonomarzi-api-dev > "$build_dir/previous-function.json"
curl --fail --silent --show-error \
  "$(jq -r '.Code.Location' "$build_dir/previous-function.json")" \
  -o "$backup_path/api-before-$revision.zip"
unzip -tq "$backup_path/api-before-$revision.zip"
aws lambda update-function-code --function-name sonomarzi-api-dev \
  --zip-file fileb://dist/api.zip --query '{Status:LastUpdateStatus,CodeSha256:CodeSha256}'
aws lambda wait function-updated --function-name sonomarzi-api-dev
local_hash=$(openssl dgst -sha256 -binary dist/api.zip | openssl base64 -A)
remote_hash=$(aws lambda get-function-configuration --function-name sonomarzi-api-dev --query CodeSha256 --output text)
test "$local_hash" = "$remote_hash"
printf '%s\n' "$revision" > "$backup_path/deployed-pr163-sha.txt"
echo "SECURITY FIX DEPLOYED: $revision"
echo 'Lambda package hash verified.'
