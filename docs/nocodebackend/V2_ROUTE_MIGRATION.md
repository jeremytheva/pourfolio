# NoCodeBackend V2 data route migration

Current NoCodeBackend V2 documentation describes generated table APIs as RESTful collection routes rather than the legacy operation-prefixed routes.

Pourfolio therefore uses:

- `GET /{collection}` for list/read;
- `GET /{collection}/{id}` for read by id;
- `POST /{collection}` for create;
- `PUT /{collection}/{id}` for update;
- `DELETE /{collection}/{id}` for delete.

The upstream surfaces remain distinct:

- authentication: `https://app.nocodebackend.com/api/user-auth`;
- generated data: `https://api.nocodebackend.com/`.

The server-only `NOCODEBACKEND_SECRET_KEY` and runtime `NOCODEBACKEND_INSTANCE` contract is unchanged.

This migration supersedes repository examples that still show `/read`, `/create`, `/update`, or `/delete` generated-data prefixes; those examples are historical and must not be used for new runtime code.
