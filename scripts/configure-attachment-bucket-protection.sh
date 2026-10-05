#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
ATTACHMENTS_BUCKET="${ATTACHMENTS_BUCKET:-sonomarzi-attachments-dev-458826002208-files}"

echo "Protecting attachment bucket: $ATTACHMENTS_BUCKET"

aws s3api put-public-access-block \
  --bucket "$ATTACHMENTS_BUCKET" \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true \
  --region "$REGION"

aws s3api put-bucket-versioning \
  --bucket "$ATTACHMENTS_BUCKET" \
  --versioning-configuration Status=Enabled \
  --region "$REGION"

aws s3api put-bucket-encryption \
  --bucket "$ATTACHMENTS_BUCKET" \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}' \
  --region "$REGION"

echo
echo "Versioning:"
aws s3api get-bucket-versioning --bucket "$ATTACHMENTS_BUCKET" --region "$REGION"

echo
echo "Public access block:"
aws s3api get-public-access-block --bucket "$ATTACHMENTS_BUCKET" --region "$REGION"

echo
echo "Encryption:"
aws s3api get-bucket-encryption --bucket "$ATTACHMENTS_BUCKET" --region "$REGION"

echo
echo "Attachment bucket protection configured."
