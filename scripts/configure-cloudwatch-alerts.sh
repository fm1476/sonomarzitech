#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
ALERT_EMAIL="${ALERT_EMAIL:-}"
DB_INSTANCE_ID="${DB_INSTANCE_ID:-}"
SNS_TOPIC_NAME="${SNS_TOPIC_NAME:-sonomarzi-ops-alerts}"
MAIN_LAMBDA="${MAIN_LAMBDA:-sonomarzi-api-dev}"
IDENTITY_LAMBDA="${IDENTITY_LAMBDA:-sonomarzi-identity-admin-dev}"

if [[ -z "$ALERT_EMAIL" ]]; then
  echo "Set ALERT_EMAIL to the operations email that should receive AWS alerts."
  exit 1
fi
if [[ -z "$DB_INSTANCE_ID" ]]; then
  echo "Set DB_INSTANCE_ID to the SonoMarzi RDS DB instance identifier."
  exit 1
fi

TOPIC_ARN="$(aws sns create-topic --name "$SNS_TOPIC_NAME" --region "$REGION" --query TopicArn --output text)"
aws sns subscribe \
  --topic-arn "$TOPIC_ARN" \
  --protocol email \
  --notification-endpoint "$ALERT_EMAIL" \
  --region "$REGION" \
  --no-cli-pager >/dev/null

alarm_lambda_errors(){
  local fn="$1"
  aws cloudwatch put-metric-alarm \
    --alarm-name "SonoMarzi-${fn}-Errors" \
    --alarm-description "SonoMarzi Lambda errors detected" \
    --namespace AWS/Lambda \
    --metric-name Errors \
    --dimensions Name=FunctionName,Value="$fn" \
    --statistic Sum \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --treat-missing-data notBreaching \
    --alarm-actions "$TOPIC_ARN" \
    --region "$REGION" \
    --no-cli-pager
}

alarm_lambda_throttles(){
  local fn="$1"
  aws cloudwatch put-metric-alarm \
    --alarm-name "SonoMarzi-${fn}-Throttles" \
    --alarm-description "SonoMarzi Lambda throttles detected" \
    --namespace AWS/Lambda \
    --metric-name Throttles \
    --dimensions Name=FunctionName,Value="$fn" \
    --statistic Sum \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --treat-missing-data notBreaching \
    --alarm-actions "$TOPIC_ARN" \
    --region "$REGION" \
    --no-cli-pager
}

for fn in "$MAIN_LAMBDA" "$IDENTITY_LAMBDA"; do
  alarm_lambda_errors "$fn"
  alarm_lambda_throttles "$fn"
done

aws cloudwatch put-metric-alarm \
  --alarm-name "SonoMarzi-RDS-CPU-High" \
  --alarm-description "SonoMarzi RDS CPU above 80 percent" \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value="$DB_INSTANCE_ID" \
  --statistic Average \
  --period 300 \
  --evaluation-periods 3 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --treat-missing-data missing \
  --alarm-actions "$TOPIC_ARN" \
  --region "$REGION" \
  --no-cli-pager

aws cloudwatch put-metric-alarm \
  --alarm-name "SonoMarzi-RDS-FreeStorage-Low" \
  --alarm-description "SonoMarzi RDS free storage below 5 GiB" \
  --namespace AWS/RDS \
  --metric-name FreeStorageSpace \
  --dimensions Name=DBInstanceIdentifier,Value="$DB_INSTANCE_ID" \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 5368709120 \
  --comparison-operator LessThanThreshold \
  --treat-missing-data missing \
  --alarm-actions "$TOPIC_ARN" \
  --region "$REGION" \
  --no-cli-pager

echo
echo "Monitoring alarms created. AWS sent a subscription confirmation to $ALERT_EMAIL."
echo "The email subscription must be confirmed before notifications will be delivered."
