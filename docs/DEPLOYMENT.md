# Deployment

AWS resources:

- Region: `us-east-2`
- Main Lambda: `sonomarzi-api-dev`
- Identity Lambda: `sonomarzi-identity-admin-dev`
- Frontend S3 bucket: `sonomarzi-app-dev-458826002208-us-east-2-an`
- CloudFront distribution: `EA4Z48KSEJBUU`

GitHub deployment uses OIDC and temporary AWS credentials. Permanent AWS access keys must not be stored in GitHub.

Expected IAM role:

`arn:aws:iam::458826002208:role/sonomarzi-github-deploy`

The workflow is manual-only until the OIDC role is created and tested. After a successful manual deployment, it can be changed to deploy automatically on pushes to `main`.
