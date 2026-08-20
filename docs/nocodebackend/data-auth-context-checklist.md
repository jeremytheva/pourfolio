# Verification checklist

- Better Auth cookie forwarded; unrelated cookies excluded.
- Origin and Referer forwarded from trusted request/application origin.
- `Instance` query and `X-Database-Instance` header preserved.
- database secret remains server-only.
- request-scoped context uses AsyncLocalStorage to prevent cross-user leakage.
- products, profile, cellar and rating-form all pass through the common data router context.
