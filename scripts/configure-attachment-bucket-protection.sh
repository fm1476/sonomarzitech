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

# Browser uploads use short-lived pre-signed S3 URLs. The bucket therefore needs CORS for
# SonoMarzi's production origins even though the bucket itself remains fully private.
aws s3api put-bucket-cors \
  --bucket "$ATTACHMENTS_BUCKET" \
  --cors-configuration '{
    "CORSRules":[
      {
        "AllowedOrigins":[
          "https://*.sonomarzi.com",
          "https://sonomarzi.com",
          "https://www.sonomarzi.com",
          "https://d1b97r2bbw5qld.cloudfront.net"
        ],
        "AllowedMethods":["GET","PUT","HEAD"],
        "AllowedHeaders":["*"],
        "ExposeHeaders":["ETag"],
        "MaxAgeSeconds":3600
      }
    ]
  }' \
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
echo "CORS:"
aws s3api get-bucket-cors --bucket "$ATTACHMENTS_BUCKET" --region "$REGION"

echo
echo "Attachment bucket protection configured."
