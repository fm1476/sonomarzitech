#!/usr/bin/env bash
set -euo pipefail

ACCOUNT_ID="458826002208"
REGION="us-east-2"
ROLE_NAME="sonomarzi-github-deploy"
REPO="fm1476/sonomarzitech"
OIDC_URL="https://token.actions.githubusercontent.com"
OIDC_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"

echo "Checking GitHub Actions OIDC provider..."
if ! aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_ARN" >/dev/null 2>&1; then
  echo "Creating GitHub Actions OIDC provider..."
  aws iam create-open-id-connect-provider \
    --url "$OIDC_URL" \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 >/dev/null
else
  echo "OIDC provider already exists."
fi

cat > /tmp/sonomarzi-github-trust.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "$OIDC_ARN"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:${REPO}:ref:refs/heads/main"
        }
      }
    }
  ]
}
JSON

if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  echo "Updating trust policy on $ROLE_NAME..."
  aws iam update-assume-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-document file:///tmp/sonomarzi-github-trust.json
else
  echo "Creating $ROLE_NAME..."
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document file:///tmp/sonomarzi-github-trust.json >/dev/null
fi

cat > /tmp/sonomarzi-github-permissions.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DeploySonoMarziLambdas",
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:GetFunction",
        "lambda:GetFunctionConfiguration"
      ],
      "Resource": [
        "arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:sonomarzi-api-dev",
        "arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:sonomarzi-identity-admin-dev"
      ]
    },
    {
      "Sid": "DeploySonoMarziFrontend",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::sonomarzi-app-dev-458826002208-us-east-2-an"
    },
    {
      "Sid": "WriteSonoMarziFrontendObjects",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::sonomarzi-app-dev-458826002208-us-east-2-an/*"
    },
    {
      "Sid": "InvalidateSonoMarziCloudFront",
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::${ACCOUNT_ID}:distribution/EA4Z48KSEJBUU"
    }
  ]
}
JSON

aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "sonomarzi-github-deploy-policy" \
  --policy-document file:///tmp/sonomarzi-github-permissions.json

echo
echo "Done."
echo "Role ARN: arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"
echo "GitHub repo: ${REPO}"
echo "Next: run the 'Deploy SonoMarzi to AWS' workflow manually from GitHub Actions."
