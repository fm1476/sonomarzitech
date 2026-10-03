# AWS configuration available in this repository

- `aws/lambda/sonomarzi-api-dev/index.mjs` is the deployed development Node Lambda source. It establishes the current table and API contracts, but contains no deployable C# stack configuration.
- `aws/migrations/20261003_0004_demo_pd_context.sql` seeds one Demo PD tenant, agency, and Cognito-linked membership. It assumes the `suite_tenants`, `suite_agencies`, `suite_users`, `suite_memberships`, and `sonomarzi_schema_migrations` tables already exist.
- `aws/MIGRATION_STATUS.md` describes the working CloudFront, private S3, Cognito, API Gateway/Lambda, and RDS setup, along with outstanding production work.
- `docs/CONVERSION.md` lists the C# API environment variables and the required same-origin `/api` route.

The repository does not contain the complete RDS schema creation history, Cognito user-pool and app-client identifiers, Lambda/IAM or CloudFront deployment definitions, S3 bucket configuration, or non-production credentials. The C# catalog queries use columns already referenced by the checked-in Lambda and Demo PD migration, but have only been exercised against the local store. AWS validation needs a non-production environment and a schema inventory before provisioning or data cutover can be completed.
