# Security

## Authentication and authorisation
Authentication calls go through `/api/nocodebackend/auth/*`; the proxy attaches `NOCODEBACKEND_SECRET_KEY` server-side and forwards session cookies. Never expose that key to Vite/browser code or prefix it with `VITE_`. Client-side protected routes are not authorisation: configure and test NoCodeBackend collection permissions for ownership, administrator roles, producer claims, venue management, and private cellar data.

## Data, validation, and logging
Validate and constrain user input before collection writes, and treat responses from external services as untrusted. Use HTTPS in deployed environments. Do not place passwords, tokens, claims verification data, private cellar contents, or sensitive user data in logs, issues, screenshots, fixtures, or browser storage. Redact operational diagnostics. Local storage is not suitable for secrets or sensitive persistent records.

## API, upload, and dependency expectations
Keep privileged calls in `api/`; preserve the auth proxy's header filtering and avoid accepting browser-supplied upstream authorisation. Follow the NoCodeBackend permissions in the schema mapping. Photo/UI upload features must enforce file type, size, ownership, and storage access rules before any production storage integration; no repository-managed upload service is currently configured. Review new dependencies, keep `package-lock.json` current, and use GitHub Dependabot/secret scanning where available. Rate limiting is not implemented in this repository; the deployment and NoCodeBackend configuration should provide it for public/auth endpoints.

## Pull request security review
Review identity/ownership checks, collection permissions, input handling, secret exposure, dependency changes, data minimisation, error/log content, and browser/server boundaries. Schema/permission changes require a non-production validation and documented rollout.

## Reporting a vulnerability
Do not open a public issue with exploit details or sensitive evidence. Use GitHub's private security advisory flow for this repository when enabled, or contact the maintainers through the repository owner privately. Include impact, affected versions/paths, safe reproduction steps, and suggested mitigation. Allow reasonable time for triage before disclosure.
