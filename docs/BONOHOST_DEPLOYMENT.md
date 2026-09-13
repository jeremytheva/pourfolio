# BonoHost deployment

This runbook covers the host-neutral Node.js deployment path for Pourfolio. Vercel remains supported through `vercel.json`; BonoHost uses `server/index.mjs` and the same `api/` handlers.

## BonoHost Node.js application

Configure the application as follows:

| Setting | Value |
| --- | --- |
| Node.js version | `24.x` |
| Application mode | `Production` |
| Application root | `apps/pourfolio` |
| Application URL | `https://pourfolio.platformfoundry.top` |
| Application startup file | `server/index.mjs` |

BonoHost should provide `PORT`. Do not hard-code the public application port. The runtime binds to `0.0.0.0` by default and accepts an optional `HOST` override.

If BonoHost does not provide Node.js 24, do not silently select another runtime. Validate the repository against the proposed runtime and update the repository runtime contract as a separate change.

## Application files

Keep the Git checkout outside `public_html`:

```text
/home/<account>/apps/pourfolio
```

Initial installation:

```bash
mkdir -p ~/apps
cd ~/apps
git clone https://github.com/jeremytheva/pourfolio.git pourfolio
cd pourfolio
npm ci
npm run build
```

After the build, `dist/index.html` and `dist/assets/` must exist. Start or restart the application through BonoHost's Node.js application manager using `server/index.mjs`.

For subsequent releases:

```bash
cd ~/apps/pourfolio
git pull --ff-only origin main
npm ci
npm run build
```

Restart the Node.js application after the build completes.

## Environment variables

Configure these in the BonoHost Node.js application's environment-variable controls. Do not commit their secret values and do not place a production `.env` under `public_html`.

```text
NOCODEBACKEND_AUTH_BASE_URL=https://app.nocodebackend.com/api/user-auth
NOCODEBACKEND_DATA_BASE_URL=https://api.nocodebackend.com/
NOCODEBACKEND_AUTH_SECRET_KEY=<secret>
NOCODEBACKEND_SECRET_KEY=<secret>
NOCODEBACKEND_INSTANCE=<instance>
pourfolio_KV_REST_API_URL=<redis-rest-url>
pourfolio_KV_REST_API_TOKEN=<secret>
```

`RATE_LIMIT_KEY_SECRET` is optional. When absent, the application derives a domain-separated rate-limit key from `NOCODEBACKEND_AUTH_SECRET_KEY`.

`ALLOWED_ORIGINS` should remain unset for a normal same-origin deployment. Add explicit origins only when there is an approved cross-origin requirement.

## Runtime behavior

`server/runtime.mjs` preserves the production boundaries used by the Vercel deployment:

- `/api/nocodebackend/auth/*` delegates to `api/auth-proxy.js`;
- `/api/nocodebackend/*` delegates to `api/data-router.js`;
- `/api/health` delegates to `api/health.js`;
- `/api/readiness` delegates to `api/readiness.js`;
- unknown `/api/*` routes fail closed with `404`;
- `/assets/*` is served from the generated `dist/` build with immutable caching;
- other non-API GET/HEAD routes use the SPA fallback to `dist/index.html`;
- production security headers match the `vercel.json` contract.

The runtime does not expose the old flat data proxy files as public routes.

## Pre-cutover validation

Before changing production DNS, validate the BonoHost staging URL:

```text
https://pourfolio.platformfoundry.top/
https://pourfolio.platformfoundry.top/api/health
https://pourfolio.platformfoundry.top/api/readiness
```

Then verify sign-up/sign-in/session refresh/sign-out, catalogue reads, product detail, rating submission/history, cellar and profile workflows.

Keep the existing Vercel production deployment available until BonoHost has passed runtime/browser validation and rollback is no longer required.
