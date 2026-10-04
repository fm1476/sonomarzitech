# C# API and React/TypeScript deployment plan

**Branch:** `staging` · **Status:** plan only; no AWS changes or production cutover authorized by this document.

## Target and release rule

Keep the current AWS application available while the new build is validated in an isolated AWS staging environment. The intended request path is:

```text
Browser → CloudFront ┬─ /*       → private S3 frontend (`dist/`)
                     └─ /api/*  → API Gateway HTTP API → .NET 10 Lambda → RDS PostgreSQL
                                                          └──────────────→ private S3 attachments
Browser → Cognito authorization-code/PKCE login
```

The C# Lambda uses `Amazon.Lambda.AspNetCoreServer.Hosting` with the HTTP API event source; configure API Gateway for payload format **2.0** and preserve the `/api` path through CloudFront. AWS documents the [.NET 10 managed Lambda runtime](https://docs.aws.amazon.com/lambda/latest/dg/lambda-csharp.html) and [HTTP API payload formats](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html). The old Node Lambda and root `index.html` stay available as rollback references until the cutover is complete.

Do **not** promote this branch to production merely because it builds. The open gates in [MERGE_READINESS.md](MERGE_READINESS.md) include unfinished module React screens, tenant provisioning, invitations/password flows, Mark43, push/email delivery, and live AWS testing. Those functions must either work and pass acceptance tests or be deliberately disabled in the production UI with an approved scope decision.

## 1. Inventory and establish a staging environment

1. Record the current AWS account/region, CloudFront distribution and origin settings, frontend and attachment buckets, API Gateway API/stage/routes, Lambda name/alias/runtime/role/VPC settings, RDS instance and backup retention, Secrets Manager secret ARN, Cognito pool/app client/domain/callback URLs, DNS, certificates, and current deployed versions. Export current infrastructure configuration for comparison; do not copy credentials into Git or deployment logs.
2. Run the read-only [schema inventory query](../aws/inspection/schema_inventory.sql) against a **non-production** RDS copy. Compare its tables, constraints, indexes, policies, and triggers with the C# queries and the checked-in Node Lambda. Obtain the complete migration history and make every required schema change an ordered, repeatable migration.
3. Establish a separate staging hostname, Cognito app client/callback, API Gateway/Lambda, private frontend bucket or release prefix, attachment bucket/prefix, and RDS copy. Prefer a separate AWS account; if that is unavailable, isolate every resource and IAM policy by environment. Use synthetic or approved masked data.
4. Define the infrastructure in version-controlled IaC before production rollout. Adopt existing resources only after inventory so a stack deployment cannot unexpectedly replace the running application. Record the chosen IaC tool and resource ownership in this document when known.

**Gate:** a clean staging environment exists, its resource identifiers are documented outside source control as appropriate, and the C# RDS schema assumptions have been checked against the actual schema.

## 2. Close application release gates

- Finish the C# routes used by enabled UI controls, including tenant/agency provisioning, invitation and password workflows, Mark43, and delivery services. Preserve tenant and agency authorization at the API; a hidden button is not a security boundary.
- Complete the remaining module screen migration and role/form regression coverage. Test officer, trainer, supervisor, agency admin, and platform admin in at least two tenants and agencies, including denied cross-tenant reads and writes.
- Confirm Cognito session expiration and renewal behavior. The current frontend handles authorization-code/PKCE sign-in but does not implement a refresh-token flow; users must not be left with unexplained failed saves when an ID token expires.
- Validate signed attachment upload, download, delete, file-size/content-type limits, bucket CORS, and browser behavior for every module that stores files. Presigned URLs grant time-limited access; keep the attachment bucket private. See [S3 presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html).
- Remove or route dormant Supabase calls and temporary migration/test endpoints from the production build. Confirm that no production browser request targets Supabase or a local API.

**Gate:** the release scope is explicit, every enabled user path has an API contract and test, and `docs/MERGE_READINESS.md` has no unresolved production blocker.

## 3. Package and configure the staging release

From a clean commit on `staging`, have CI or a controlled build host produce immutable artifacts tied to the commit SHA:

```sh
npm ci
npm test
npm run test:e2e
npm run build
dotnet publish backend/SonoMarzi.Api -c Release --no-restore
```

Package the C# Release output for the **Linux architecture configured on Lambda**, including the assembly, dependencies, `.deps.json`, `.runtimeconfig.json`, `Authorization/rules.json`, and `Development/seed.json` only if the deployed application actually requires it. Use AWS .NET Lambda packaging tooling or a reproducible CI zip step; AWS describes the required [.NET zip contents](https://docs.aws.amazon.com/lambda/latest/dg/csharp-package.html). Never set `Local__Enabled=true` in AWS. Set `ASPNETCORE_ENVIRONMENT=Production` and use the .NET 10 runtime and handler configuration validated by a staging invocation.

Configure the Lambda with environment-specific values, not local `.env` files:

| Setting | Source / check |
| --- | --- |
| `Cognito__Issuer`, `Cognito__ClientId`, `Cognito__Domain`, `Cognito__RedirectUri` | Staging user pool/app client and exact HTTPS callback; verify the callback is registered. |
| `AWS__Region`, `AWS__DatabaseHost`, `AWS__DatabasePort`, `AWS__DatabaseName` | Staging RDS endpoint and database. |
| `AWS__DatabaseSecretArn` | Staging Secrets Manager secret ARN; the database password stays in Secrets Manager. |
| `AWS__DatabaseRootCertificate` | Trusted RDS CA path if a custom CA file is needed; confirm `VerifyFull` TLS succeeds. |
| `AWS__AttachmentsBucket` | Staging private attachment bucket. |
| `Cors__Origins__0` and later entries | Only approved cross-origin frontend URLs, if any; the preferred browser API path is same-origin `/api`. |

Give the Lambda role only the database-secret read permission and attachment-bucket actions it uses, plus logging and VPC execution permissions. Allow Lambda-to-RDS traffic through narrowly scoped security groups. Confirm private-network access to Secrets Manager (for example, an [interface VPC endpoint](https://docs.aws.amazon.com/secretsmanager/latest/userguide/vpc-endpoint-overview.html)) and S3 (the existing AWS development setup reports a gateway endpoint). Verify these routes by actually opening a database connection and signing/uploading an attachment.

## 4. Configure CloudFront and deploy to staging

1. Keep the frontend bucket private behind CloudFront origin access control. AWS documents [OAC for private S3 origins](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html).
2. Route `/api/*` to the staging API Gateway origin with all required HTTP methods, query strings, request bodies, and the viewer `Authorization` header. Use a non-caching API behavior. CloudFront can otherwise omit authorization or share cached authenticated responses; AWS documents the [authorization forwarding requirement](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/add-origin-custom-headers.html) and an [API Gateway origin policy that excludes only `Host`](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html). Verify `/api/config` and `/api/health` are reachable before sign-in, while protected routes reject unauthenticated requests.
3. Publish a new Lambda version and point a **staging alias** at it. Do not replace the current Node Lambda integration. Route staging API Gateway to that alias and check the HTTP API payload format and `/api` path end to end.
4. Upload the `dist/` build to a new staging release location; retain the previous release. Upload JavaScript/CSS and other assets before `index.html`. Current output uses fixed names such as `assets/app.js` and `assets/react.js`, so use short/no-cache headers for HTML, service worker, and these unversioned assets, then invalidate changed CloudFront paths. A later build change can use content-hashed asset names. AWS documents [versioning versus invalidation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html).
5. Register the exact staging callback and sign-out URLs in Cognito and test PKCE login and logout from the staging hostname. Cognito requires registered callback URLs; see [app-client settings](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.html).

**Gate:** staging serves the new frontend and C# API on the same origin, uses only staging resources, and the old AWS development deployment is unaffected.

## 5. Staging acceptance and data rehearsal

Run the local checks again against the release commit, then test the deployed system with synthetic or masked data:

- API: health/config, Cognito login, membership selection, role filtering, tenant isolation, optimistic write conflict, service endpoints, and attachment URL expiration/upload/download/delete.
- UI: My Work, Readiness, shared navigation, each of the nine modules, reports, administration, mobile layout, refresh/deep-link behavior, and token expiration. Check browser console and network requests.
- Data: compare counts and representative records with the source; exercise new Field Training, workflow, notice, audit, and notification-read keys. Rehearse any Supabase-to-RDS migration on an isolated copy, reconcile identities and person IDs, and verify no cross-tenant records move.
- Operations: CloudWatch errors, duration and throttles; API Gateway 4xx/5xx and latency; RDS connectivity and connection pressure; S3 access failures; login failures. Agree on alarm thresholds from staging baselines before rollout.
- Recovery: verify an RDS snapshot and automated-backup retention, then perform a restore rehearsal into a separate database. RDS [restore from backup](https://docs.aws.amazon.com/AmazonRDS/latest/gettingstartedguide/managing-backup-restore.html) creates a separate instance, so the recovery path must be tested before cutover.

Record test evidence, the artifact SHA, schema version, open issues, and an explicit go/no-go decision. Do not use real customer data in staging without an approved handling plan.

## 6. Production promotion

Only after staging acceptance and a reviewed cutover window:

1. Take and verify an RDS snapshot; record the current Lambda alias version, frontend release, CloudFront settings, Cognito client settings, and database schema version. Freeze incompatible writes or define a replay window for any migration.
2. Apply backward-compatible database changes first. Keep old and new API versions compatible with the same schema through the rollback window; defer destructive schema cleanup.
3. Publish the exact tested C# artifact to a new production Lambda version. Route a small canary through an alias, monitor alarms and tenant-specific smoke tests, then increase traffic. AWS supports [weighted aliases and rollback](https://docs.aws.amazon.com/lambda/latest/dg/configuring-alias-routing.html); use automated deployment/rollback if the chosen IaC pipeline supports it.
4. Promote the tested frontend artifact after the API is healthy. Upload assets before HTML, invalidate the unversioned paths, and test login, one read, one authorized write, and one attachment round trip from the production hostname.
5. Monitor for an agreed observation period before changing `main`, retiring the Node Lambda, deleting rollback artifacts, or making destructive database migrations.

## Rollback and stop conditions

Stop promotion on failed role/tenant isolation, failed writes, elevated 5xx/errors, authentication failures, attachment failures, schema mismatch, or an unverified backup. Repoint the API alias to the prior version and restore the previous frontend artifact/CloudFront configuration, then invalidate affected unversioned paths. Keep the old Node Lambda available until the new release has passed the observation period.

A database snapshot restore is a **separate recovery operation**, not an instant undo: writes after the snapshot would need reconciliation or replay. If the migration cannot be reversed without losing accepted writes, pause the cutover and define that replay procedure before production deployment. Record who makes the go/no-go and rollback calls and how affected users are informed in the release runbook.

## Work still needed to make this executable

- AWS resource inventory and full non-production RDS schema/migration history (the repo currently has only a Demo PD seed migration). See [AWS_REPO_INVENTORY.md](AWS_REPO_INVENTORY.md).
- Version-controlled infrastructure and deployment pipeline, including an AWS-authenticated CI identity. The current GitHub CLI token lacks the `workflow` scope, so this repository has no checked-in CI workflow yet.
- Completed application gates and expanded role/module tests from [MERGE_READINESS.md](MERGE_READINESS.md).
- Staging Cognito identities, RDS copy, S3 buckets, API Gateway route, CloudFront hostname, and permission to run the release rehearsal. No C# AWS deployment has occurred.
