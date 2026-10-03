# sonomarzi-api-dev Lambda

This directory contains the source currently deployed to the AWS development Lambda during the SonoMarzi migration.

## Runtime

Node.js Lambda using PostgreSQL through `pg` and AWS SDK clients.

## Required environment variables

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_SECRET_ARN`
- `ATTACHMENTS_BUCKET`

Credentials are retrieved from AWS Secrets Manager. No database password should be committed to source control.

## AWS dependencies

The Lambda requires network access to RDS, Secrets Manager, and S3. The development environment uses VPC endpoints rather than a NAT Gateway for these private service paths.

The execution role must be limited to the required database-secret read permission, VPC execution permissions, logging, and the specific private attachment bucket object actions needed by the application.

## Temporary migration routes

The source still contains migration/smoke-test routes used during the AWS cutover. These must be removed after final regression testing.
