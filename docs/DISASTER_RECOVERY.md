# SonoMarzi Disaster Recovery Runbook

## Purpose

This runbook defines the minimum recovery process for the SonoMarzi pilot environment. It is an operational guide, not a contractual service-level agreement.

## Pilot recovery targets

- Recovery point objective (RPO): 24 hours or better.
- Recovery time objective (RTO): 4 hours for a pilot-impacting outage.
- Priority order: preserve data, restore authentication/API/database, restore frontend, verify tenant isolation, then reopen access.

These targets should be tightened after the first production agency and after recovery timing has been measured.

## System dependencies

SonoMarzi currently depends on:

1. CloudFront and the private S3 frontend bucket.
2. Amazon Cognito for identity.
3. API Gateway.
4. Main Lambda: `sonomarzi-api-dev`.
5. Identity Lambda: `sonomarzi-identity-admin-dev`.
6. Amazon RDS for PostgreSQL.
7. Secrets Manager for database credentials.
8. Private S3 attachment storage.
9. DNS for `*.sonomarzi.com`.

## Severity

- SEV-1: platform unavailable, suspected cross-tenant exposure, database unavailable, destructive data event, or authentication unavailable for all agencies.
- SEV-2: one major module unavailable, elevated error rates, attachment failure, or one agency unable to operate.
- SEV-3: isolated defects with a workaround and no material data/security impact.

## First response

For SEV-1:

1. Record the UTC/local detection time.
2. Stop deployments and configuration changes.
3. If there is any possibility of cross-tenant data exposure, disable affected access before troubleshooting convenience.
4. Check CloudWatch alarms and Lambda/API logs.
5. Confirm RDS status and latest restorable time.
6. Preserve relevant logs and audit events.
7. Identify whether the fault is frontend, identity, API, database, attachment storage, or DNS.
8. Start an incident log containing every action and timestamp.

## RDS recovery

Never restore over the only known-good database.

1. Identify the latest valid automated backup or point-in-time recovery target.
2. Restore to a new RDS instance.
3. Verify encryption, networking, security groups, parameter settings, and PostgreSQL connectivity.
4. Point a non-public/test Lambda configuration at the restored database first.
5. Run basic integrity checks:
   - tenant and agency counts are expected;
   - ordinary users cannot access another tenant;
   - roles and memberships load;
   - representative records load;
   - attachments referenced by records still resolve;
   - audit records are present.
6. Only after validation, update the production database secret/connection target.
7. Restart/refresh Lambda as required.
8. Run the pilot smoke test before reopening access.

## Frontend recovery

The source of truth is GitHub `main`.

1. Check out the last known-good commit.
2. Run `bash scripts/verify-source.sh`.
3. Sync `frontend/` to the production S3 frontend bucket using the documented deployment command.
4. Invalidate CloudFront.
5. Verify login, My Work, All Modules, one read and one write workflow.

Do not recover the frontend from a developer workstation copy when the GitHub commit is available.

## Lambda/API recovery

1. Identify the last known-good Git commit.
2. Build the Lambda package from that commit.
3. Update the affected Lambda.
4. Wait for the Lambda update to complete.
5. Test `/me`, `/workspace`, and one authorized write.
6. Confirm a denied write remains denied for a restricted role.

## Cognito recovery

If application data is healthy but users cannot authenticate:

1. Confirm user-pool availability and app-client configuration.
2. Confirm the app client still allows the required auth flows.
3. Confirm callback/domain settings if hosted UI is involved.
4. Confirm MFA configuration matches the intended tenant policy.
5. Do not disable MFA globally merely to bypass a troubleshooting problem.

## Attachment recovery

Application records in RDS contain attachment references. S3 attachment objects must not be treated as disposable cache.

1. Confirm the attachment bucket exists and is reachable by the API Lambda.
2. Confirm the object key begins with the correct tenant/agency prefix.
3. Confirm the record references the object before granting access.
4. For accidental deletion, recover from S3 protection/versioning if enabled. If versioning is not enabled, this remains an operational gap and should be corrected before production.

## Post-recovery validation

Before reopening a pilot:

- admin can sign in;
- ordinary pilot user can sign in;
- two-tenant isolation test passes;
- role matrix spot-check passes;
- create/edit/persist/refresh works;
- audit log identifies the actor;
- attachments upload/download with authorized users and deny unauthorized users;
- CloudWatch returns to normal;
- incident log records recovery time and any lost-data window.

## Required test cadence

- Monthly: inspect RDS backup retention and latest restorable time.
- Quarterly during pilot: perform a restore rehearsal to a temporary RDS instance.
- After material architecture change: rerun the recovery rehearsal.
- After any SEV-1 incident: perform a documented post-incident review.

## Evidence

Save screenshots or CLI output from each backup verification and restore rehearsal in the security/operations evidence folder. A backup is not considered proven until a restore has succeeded and application data has been verified.
