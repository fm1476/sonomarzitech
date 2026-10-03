# Staging to main review

Status: **not ready to merge**. This branch contains the AWS v14 source and the local C#/TypeScript conversion. Keep `main` on the existing application until the gates below pass.

## Verified locally

- TypeScript checks, the C# Debug build, API integration tests, and browser smoke tests pass with isolated local data.
- The C# Release publish succeeds. `npm audit --omit=dev --audit-level=high` reports no production dependency advisories.
- Authentication, role-filtered workspace reads, optimistic version checks, Field Training, in-app notices, notification reads, primary feature navigation, and one real record edit are covered locally.
- The review removed legacy account records from administrator workspace responses and strips authentication/account fields from the workspace template. An unavailable push service now reports 503 instead of a successful delivery response.

## Merge gates still open

1. Replace the remaining DOM-driven feature screens with React components and narrow the extracted `any` types. The existing tests exercise navigation and selected writes, not every form or role in every module.
2. Implement and test tenant/agency provisioning, invitations and password management, and the full platform-admin catalog. The current integration route returns 503 and the catalog only returns the selected workspace.
3. Finish Mark43 and push/email delivery contracts or remove/disable those controls for the cutover. Push subscription routes currently return 503.
4. Obtain the actual RDS schema and migration history, Cognito configuration, S3 bucket setup, and staging identities. Run the C# API against those services, including role and tenant-isolation tests. The repository has only a partial AWS migration script and no local AWS credentials.
5. Inventory any data still held in Supabase, map identities and records, dry-run migration into an isolated RDS copy, and compare results before a production cutover.
6. Verify the deployment path for the TypeScript build and C# Lambda, including same-origin `/api` routing, OAuth callback, attachment upload/download, rollback, and monitoring. No C# deployment has occurred.

CI is not yet configured. GitHub rejected the proposed workflow because the current GitHub CLI OAuth token lacks the `workflow` scope. Local checks must be run manually until a workflow can be added; AWS staging validation remains separate.
