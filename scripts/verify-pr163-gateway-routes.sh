#!/usr/bin/env bash
# Read-only API Gateway verification. Does not invoke write APIs, deploy, or change rollout.
set -euo pipefail
export AWS_REGION="${AWS_REGION:-us-east-2}" AWS_PAGER=""
api_id="${1:?Usage: bash scripts/verify-pr163-gateway-routes.sh <HTTP_API_ID>}"
command -v jq >/dev/null
aws sts get-caller-identity --query Account --output text | grep -qx '458826002208' || { echo 'Wrong AWS account' >&2; exit 1; }
api=$(aws apigatewayv2 get-api --api-id "$api_id" --output json)
jq -e '.ProtocolType=="HTTP"' <<<"$api" >/dev/null || { echo 'Not an HTTP API' >&2; exit 1; }
routes=$(aws apigatewayv2 get-routes --api-id "$api_id" --output json)
integrations=$(aws apigatewayv2 get-integrations --api-id "$api_id" --output json)
authorizers=$(aws apigatewayv2 get-authorizers --api-id "$api_id" --output json)
for route in 'POST /global-search' 'POST /field-training' 'POST /attachments/download-url' 'GET /workspace'; do
  item=$(jq -ec --arg route "$route" '.Items[] | select(.RouteKey==$route)' <<<"$routes") || { echo "FAIL missing route: $route"; exit 1; }
  auth=$(jq -r '.AuthorizationType' <<<"$item")
  aid=$(jq -r '.AuthorizerId // empty' <<<"$item")
  target=$(jq -r '.Target // empty' <<<"$item")
  [[ "$auth" == JWT && -n "$aid" && "$target" == integrations/* ]] || { echo "FAIL JWT/integration configuration: $route"; exit 1; }
  jq -e --arg id "$aid" '.Items[] | select(.AuthorizerId==$id and .AuthorizerType=="JWT")' <<<"$authorizers" >/dev/null || { echo "FAIL missing JWT authorizer: $route"; exit 1; }
  iid="${target#integrations/}"
  jq -e --arg id "$iid" '.Items[] | select(.IntegrationId==$id and .IntegrationType=="AWS_PROXY" and (.IntegrationUri|contains("lambda")))' <<<"$integrations" >/dev/null || { echo "FAIL missing Lambda proxy integration: $route"; exit 1; }
  echo "PASS | $route | JWT authorizer and Lambda proxy integration present"
done
echo 'PASS | Read-only Gateway configuration inventory complete'
echo 'NOTE | Configuration check only. Does not prove authenticated requests or tenant isolation.'
