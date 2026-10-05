#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
DB_INSTANCE_ID="${DB_INSTANCE_ID:-}"

if [[ -z "$DB_INSTANCE_ID" ]]; then
  echo "Set DB_INSTANCE_ID to the SonoMarzi RDS DB instance identifier."
  exit 1
fi

echo "RDS instance:"
aws rds describe-db-instances \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --region "$REGION" \
  --query 'DBInstances[0].{Status:DBInstanceStatus,Engine:Engine,BackupRetentionDays:BackupRetentionPeriod,BackupWindow:PreferredBackupWindow,LatestRestorableTime:LatestRestorableTime,DeletionProtection:DeletionProtection,Encrypted:StorageEncrypted,MultiAZ:MultiAZ}' \
  --output table \
  --no-cli-pager

echo
echo "Recent automated snapshots:"
aws rds describe-db-snapshots \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --snapshot-type automated \
  --region "$REGION" \
  --query 'reverse(sort_by(DBSnapshots,&SnapshotCreateTime))[:5].{Snapshot:DBSnapshotIdentifier,Created:SnapshotCreateTime,Status:Status,Encrypted:Encrypted}' \
  --output table \
  --no-cli-pager
