# SonoMarzi Public Safety Management Suite

Canonical source baseline for the SonoMarzi application.

## Baseline

This branch was created from the verified **Field Training v14** release package dated October 1, 2026. The v14 package supersedes v13 and includes the prior Field Training, operations, access, notices, and related module work.

## Deployment model

The current application is a browser-based application backed by Supabase. This repository is being prepared as the source-of-truth baseline before migration to AWS.

## Safety

Do not commit service-role credentials, passwords, private keys, or other server-side secrets. Browser-publishable configuration should be separated from privileged credentials during the AWS migration.

## Migration

AWS infrastructure work should begin only after the complete v14 application and PWA assets are committed and verified against the release package.
