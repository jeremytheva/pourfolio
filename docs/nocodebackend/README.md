# NoCodeBackend implementation sources

Use the following source hierarchy when changing the integration:

1. Project-specific setup guides supplied for this deployment.
2. Generated API documentation/export for the actual database instance.
3. Retained working implementation evidence.
4. General provider documentation only where it does not conflict with project-specific evidence.

Current project-specific records:

- `/auth_proxy_setup.md` — authentication proxy contract.
- `docs/nocodebackend/data-auth-context.md` — recovered data request authentication context.
- `docs/nocodebackend/provider-api-contract.md` — generated table CRUD contract; update only when verified against the current database-generated API.

Do not infer data CRUD semantics from the auth setup guide.
