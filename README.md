# SonoMarzi Public Safety Management

SonoMarzi is a multi-tenant public-safety management platform deployed on AWS.

## Source layout

```
frontend/
  index.html
  manifest.webmanifest
  sw.js
  assets/
    css/
    js/
      modules/
lambdas/
  api/index.mjs
  identity-admin/index.mjs
docs/
.github/workflows/
```

## Runtime architecture

CloudFront serves a private S3 frontend. API Gateway routes application requests to Lambda. Cognito provides identity and tokens. RDS PostgreSQL stores application data. Agency workspaces use `*.sonomarzi.com`.

The user-facing login and recovery experience is owned by SonoMarzi while Cognito remains the identity provider.

See `docs/ARCHITECTURE.md` and `docs/DEPLOYMENT.md`.
