# AWS v14 C# / TypeScript conversion

Source revision: `origin/aws-migration` at `2456874`. Working branch: `staging`. The checkout is separate from the earlier Supabase branch. Nothing in this branch has been deployed or merged.

## Run locally

Requires Node 22.12+ and .NET 10. Copy `.env.example` to `.env`, replace the local password, and run:

```sh
npm ci
npm run backend:local
```

In another terminal:

```sh
npm run dev
```

Open `http://localhost:3002`. The local login is `admin@local.test` with the password you set in `.env`. `officer@local.test`, `trainer@local.test`, and `supervisor@local.test` use the same local password for role tests. The local API listens on 5092. Local records live under `backend/SonoMarzi.Api/.local/`, are ignored by Git, and never contact AWS. To reset local test data, stop the API and delete that directory.

`npm run build` makes the frontend in `dist/`. `npm test` builds the C# API and runs isolated integration tests. `npm run backend:test` checks the C# build alone. React owns login and workspace selection; the existing feature screens retain their behavior in ordered TypeScript modules while their forms are converted incrementally.

## AWS deployment target

The C# API uses the existing API Gateway HTTP API event format through `Amazon.Lambda.AspNetCoreServer.Hosting`. It expects Cognito ID tokens, resolves the Cognito `sub` to `suite_users`, checks active tenant/agency membership on every request, and writes to RDS PostgreSQL. Attachment URLs are signed for the private S3 bucket. Database TLS is verified. The API needs configuration (names shown below) and IAM permissions to read the database secret and access only the attachment bucket. Set the Lambda handler to the assembly name `SonoMarzi.Api`.

- `Cognito__Issuer` (`https://cognito-idp.<region>.amazonaws.com/<pool-id>`)
- `Cognito__ClientId`, `Cognito__Domain`, `Cognito__RedirectUri`
- `AWS__Region`, `AWS__DatabaseHost`, `AWS__DatabasePort`, `AWS__DatabaseName`, `AWS__DatabaseSecretArn`, `AWS__DatabaseRootCertificate`, `AWS__AttachmentsBucket`
- `Cors__Origins__0` and further entries for the approved frontend origins if the UI and API use different origins.

The frontend calls `/api` on its own origin. CloudFront needs an `/api/*` behavior routed to API Gateway, or an equivalent same-origin reverse proxy. Cognito callback URLs must match `Cognito__RedirectUri`. Serve `dist/` from the existing private S3/CloudFront frontend and verify the CSP/CORS rules, cookies, OAuth redirect, and signed S3 upload from that origin. No deployment configuration has been applied.

## Data and service migration

The existing RDS schema already stores tenant/agency-scoped `suite_records` with per-key versions. The conversion reads and writes that contract. The new Field Training, workflow, notice, and audit services write additional scoped `suite_records` keys. For real data, first inventory the actual RDS schema and the existing Supabase Field Training, notice, workflow, provisioning, and integration data. Export encrypted backups, map Cognito user IDs to `suite_users` and person IDs, transform those module records, dry-run into an isolated RDS copy, compare counts and referential relationships, test permissions with each role, and only then schedule a cutover. The repository does not contain the complete schema or Supabase RPC/Edge Function implementations, so the migration mapping cannot be finalized from source alone.

Tenant provisioning, invitations/password management, Mark43 integration, and web push have no complete AWS implementation in the checked-in source. Administrative integration routes currently return 503 with a clear error. In-app notices work locally; push acceptance is zero. The older feature modules still contain dormant Supabase-era paths, but the new runtime client does not connect to Supabase. Those paths need replacing as their screens move into React. The feature modules are valid TypeScript, although many extracted declarations still use `any`; type narrowing remains to be done. These services require the actual RDS schema, Cognito user-pool configuration, external provider contracts, and delivery keys before they can be enabled. The older `index.html` and Node Lambda remain in the branch as reference implementations, but are not used by the local build. Do not deploy or merge this conversion as a production cutover until those services and AWS integration tests are complete.

## Checks

`npm test` covers authentication, filtered workspace reads, atomic rollback on version conflict, restricted writes, Field Training setup, and in-app notices using isolated local files. `npm run test:e2e` covers sign-in, workspace loading, navigation through every primary feature area, a real record edit saved through the C# API, QR library loading, and absence of page errors. The notification service worker is built from TypeScript. Live RDS, Cognito, S3, account provisioning, delivery providers, and cross-tenant migration have not been tested with real AWS credentials.
