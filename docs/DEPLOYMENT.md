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


## One-time AWS OIDC bootstrap

Run this from AWS CloudShell while signed into account `458826002208`:

```bash
bash scripts/bootstrap-github-oidc.sh
```

The script creates or updates the `sonomarzi-github-deploy` role and trusts only the `main` branch of `fm1476/sonomarzitech`.

After bootstrap:

1. Open GitHub Actions.
2. Run **Deploy SonoMarzi to AWS** manually.
3. Verify `demo.sonomarzi.com` and `temp5.sonomarzi.com`.
4. Only after the manual deployment succeeds, enable automatic deployment on pushes to `main`.
