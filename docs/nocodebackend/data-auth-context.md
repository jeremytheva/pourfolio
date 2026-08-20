# NoCodeBackend data request authentication context

Source evidence recovered from the retained `Bug Fixing - Mising Data.pdf` client implementation establishes the following request context for generated table API calls:

- `Instance=<database instance>` query parameter.
- `X-Database-Instance: <database instance>` header.
- `Authorization: Bearer <server-only database secret>` when configured.
- `Origin` and `Referer` headers derived from the trusted application origin.
- An authenticated session `Cookie` when a user session is available.
- `X-Session-Token` may be used when the provider returns a standalone session token instead of a cookie; Pourfolio currently receives and persists Better Auth cookies, so Cookie forwarding is the active path.

Pourfolio must forward only Better Auth session cookies to the upstream data API. Unrelated browser cookies must not cross the provider boundary.

This document records authentication/request-context evidence only. CRUD paths remain governed by the generated table API contract and must not be changed based solely on auth documentation.
