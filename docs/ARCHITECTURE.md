# Architecture

## Frontend
Static application served through CloudFront from S3. Source is separated into HTML, CSS, shared JavaScript, module JavaScript, PWA support, and authentication integration.

## Main API
The API Gateway Lambda is organized by backend domain under `lambdas/api/`.

- `index.mjs` is the thin Lambda entry point and HTTP router.
- `core.mjs` contains shared database, authentication, workspace, authorization, attachment, and common application services.
- `apply-changes.mjs` owns the controlled versioned record write path.
- `field-training.mjs` owns Field Training operations.
- `staff-notices.mjs` owns staff notice persistence and delivery operations.
- `audit.mjs` owns durable activity and audit-log access.
- `tenant-admin.mjs` owns tenant, agency, user, and platform administration database operations.
- `workflows.mjs` owns workflow and approval operations.
- `lib/agency-subdomains.mjs` contains shared tenant-hostname validation and schema support.

The deployment package includes the complete `lambdas/api/` module tree so imports remain available to the Lambda runtime.

## Identity administration
`lambdas/identity-admin/index.mjs` handles privileged Cognito operations, secure account activation, access-email workflows, and tenant URL registration.

## Authentication
Cognito stores and validates credentials and issues tokens. SonoMarzi owns the user-facing login, activation, recovery, and tenant-aware experience.

## Multi-tenancy
Agency workspaces use dedicated `*.sonomarzi.com` hostnames. Backend authorization enforces tenant and agency membership.
