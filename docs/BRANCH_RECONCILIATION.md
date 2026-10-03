# Reconciliation with `feature/csharp-typescript-saas`

`staging` follows the newer AWS v14 application. The older `feature/csharp-typescript-saas` branch diverged before that application and targets Supabase Auth and PostgreSQL. A merge of the full branch would replace the current Cognito, RDS, S3, API, and feature baseline, so its reusable UI work was adapted here instead.

## Adapted into staging

- The typed React module launcher now renders the authorized Workspaces page using the current module metadata and navigation.
- Shared TypeScript HTML escaping, currency formatting, toasts, and sortable tables now back the existing feature screens. Sortable headers escape data-derived labels and attributes, and notifications have accessible status roles.
- The browser smoke test checks that the React launcher opens a workspace and that sortable labels are escaped.

## Already covered in staging

- The AWS-compatible React login, workspace switcher, authentication hook, button, form field, and C# API already have separate implementations. Duplicating the older Supabase-oriented versions would split session and UI behavior.

## Still separate work

- The old Supabase backend, SQL migrations, and Supabase health hook are not suitable for the AWS deployment path.
- The older flat React navigation was not copied. The current nested navigation, search, favorites, and permissions have since been migrated into a typed React component adapted to the AWS application.
- Older feature screen changes have a different source baseline. Each workflow needs comparison against v14 and its own React conversion and browser coverage; this reconciliation does not claim those screens are converted.

`staging` does not contain the old branch commit history. These are selected, adapted changes. The remaining merge gates are tracked in [MERGE_READINESS.md](MERGE_READINESS.md).
