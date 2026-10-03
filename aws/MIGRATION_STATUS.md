# AWS Migration Status

Updated: 2026-10-03

This branch is the current source of truth for the SonoMarzi AWS migration in progress. The `main` branch remains the pre-cutover baseline until regression testing and cleanup are complete.

## Working on AWS

- CloudFront serves the private S3-hosted application frontend.
- Cognito authentication is wired into the application.
- API Gateway + Lambda provide the application API.
- PostgreSQL operational data is persisted in Amazon RDS.
- Tenant/agency workspace loading and optimistic version-controlled writes are working.
- Platform-admin, agency-admin, officer self-service, Fleet, Quartermaster, K9, Civil, Subpoena, Drone, EOD, Grants, Personnel, and shared authorization logic has been ported into the AWS Lambda path.
- Private S3 attachment upload/download/delete endpoints are implemented.
- Subpoena document attachments use private S3.
- Shared photo management used by Civil Process, Quartermaster, Fleet, and Grants uses private S3.
- An S3 Gateway VPC endpoint is used so the private Lambda can reach S3 without a NAT Gateway.

## Current frontend

The root `index.html` on this branch matches the latest AWS development frontend deployed tonight, including AWS persistence, S3 document attachments, and shared S3 photo handling.

## Current backend

The current deployed Lambda source is stored at:

`aws/lambda/sonomarzi-api-dev/index.mjs`

Runtime configuration is supplied by Lambda environment variables and AWS-managed services. Secrets are not stored in this repository.

## Remaining before production cutover

- Finish remaining specialized attachment/avatar migrations.
- Move notices/email delivery fully to AWS services.
- Finish audit/event persistence cleanup.
- Remove remaining direct Supabase calls and temporary migration/test routes.
- Complete module-by-module regression testing.
- Add production hardening, environment separation, monitoring, backup/restore verification, and final security review.
- Configure wildcard customer subdomains such as `tenant.sonomarzi.com`.

Do not merge this branch into `main` as a production cutover until the regression and cleanup work above is complete.
