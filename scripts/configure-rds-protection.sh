#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
DB_INSTANCE_ID="${DB_INSTANCE_ID:-}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if [[ -z "$DB_INSTANCE_ID" ]]; then
  echo "Set DB_INSTANCE_ID to the SonoMarzi RDS DB instance identifier."
  exit 1
fi

echo "Configuring RDS protection for $DB_INSTANCE_ID in $REGION"

aws rds modify-db-instance \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --backup-retention-period "$RETENTION_DAYS" \
  --copy-tags-to-snapshot \
  --deletion-protection \
  --apply-immediately \
  --region "$REGION" \
  --no-cli-pager

aws rds wait db-instance-available \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --region "$REGION"

echo
echo "Current protection settings:"
aws rds describe-db-instances \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --region "$REGION" \
  --query 'DBInstances[0].{Status:DBInstanceStatus,Engine:Engine,MultiAZ:MultiAZ,BackupRetentionPeriod:BackupRetentionPeriod,PreferredBackupWindow:PreferredBackupWindow,LatestRestorableTime:LatestRestorableTime,DeletionProtection:DeletionProtection,StorageEncrypted:StorageEncrypted}' \
  --output table \
  --no-cli-pager

echo
echo "RDS backup retention and deletion protection are configured."
