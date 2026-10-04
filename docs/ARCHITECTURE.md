# Architecture

## Frontend
Static application served through CloudFront from S3. Source is separated into HTML, CSS, shared JavaScript, module JavaScript, PWA support, and authentication integration.

## Main API
`lambdas/api/index.mjs` is the primary application Lambda behind API Gateway and RDS PostgreSQL.

## Identity administration
`lambdas/identity-admin/index.mjs` handles privileged Cognito operations, secure account activation, access-email workflows, and tenant URL registration.

## Authentication
Cognito stores and validates credentials and issues tokens. SonoMarzi owns the user-facing login, activation, recovery, and tenant-aware experience.

## Multi-tenancy
Agency workspaces use dedicated `*.sonomarzi.com` hostnames. Backend authorization enforces tenant and agency membership.
