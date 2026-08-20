# Data proxy recovery note

The exact `data_proxy_setup.md` file was not found in the available project/file sources. However, retained implementation evidence in `Bug Fixing - Mising Data.pdf` contains the relevant NoCodeBackend client request contract used to recover the missing authentication context.

Recovered request requirements:

- API base plus generated table operation path.
- `Instance` query parameter.
- `X-Database-Instance` header.
- server-only Bearer database secret.
- trusted `Origin` and `Referer` headers.
- authenticated session Cookie when available.

This recovery note does not authorise changing CRUD operation paths beyond the currently verified generated table API contract.
