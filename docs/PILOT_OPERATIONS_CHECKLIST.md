# Pilot Operations Checklist

This checklist is the operational gate for a controlled agency pilot.

## Before first pilot

- [ ] Deploy a known-good commit from `main`.
- [ ] Run `bash scripts/verify-source.sh`.
- [ ] Configure RDS backup retention and deletion protection.
- [ ] Verify a recent automated RDS backup and latest restorable time.
- [ ] Complete one RDS restore rehearsal to a temporary instance and validate application data.
- [ ] Enable S3 versioning, encryption, and public-access blocking on the attachment bucket.
- [ ] Configure CloudWatch/SNS alerts and confirm the alert email subscription.
- [ ] Trigger a safe test alarm or temporarily lower a threshold to prove delivery.
- [ ] Complete the two-tenant isolation test with ordinary users.
- [ ] Complete the live role matrix.
- [ ] Verify one attachment upload/download/delete path for an authorized user and one denied path for an unauthorized user.
- [ ] Verify audit entries identify the real actor.
- [ ] Verify MFA behavior matches the configured pilot tenant policy.
- [ ] Run critical workflow regression tests and persistence checks.
- [ ] Review the disaster recovery runbook.
- [ ] Review the agency offboarding/export runbook.
- [ ] Name the primary pilot support contact and escalation contact.

## Weekly during pilot

- [ ] Check CloudWatch alarms and recent Lambda errors.
- [ ] Check RDS status, free storage, and backup recency.
- [ ] Review unresolved pilot defects.
- [ ] Review security-sensitive audit events.
- [ ] Confirm no unexpected tenant/module entitlement changes occurred.

## Monthly during pilot

- [ ] Run `scripts/verify-rds-backups.sh`.
- [ ] Review IAM and Platform Admin access.
- [ ] Review Cognito MFA configuration.
- [ ] Review dependency/runtime patching needs.
- [ ] Review storage growth and attachment volume.

## Quarterly during pilot

- [ ] Restore RDS to a temporary instance and validate the restored application.
- [ ] Review and update the disaster recovery runbook.
- [ ] Test agency export/offboarding procedure using a non-production/demo tenant.
