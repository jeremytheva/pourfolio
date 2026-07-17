# Architecture

## Current implementation
Pourfolio is a React single-page application built by Vite. `src/App.jsx` declares browser routes and wraps protected routes in a client-side authentication guard. Pages compose components, hooks, services, and utilities. Services use the collection client in `src/lib/nocodeBackend.js`; it normalises NoCodeBackend responses and hydrates selected relationships through follow-up requests.

```mermaid
flowchart LR
  Browser[React/Vite browser client] --> Router[React Router and protected routes]
  Router --> Pages[Pages and components]
  Pages --> Services[Collection services]
  Services --> Client[src/lib/nocodeBackend.js]
  Client --> Data[NoCodeBackend data endpoint]
  Browser --> AuthProxy[/api/nocodebackend/auth/*]
  AuthProxy --> Auth[NoCodeBackend auth API]
  AuthProxy --> Secret[NOCODEBACKEND_SECRET_KEY]
  Browser --> Local[localStorage: selected prototype/client flows]
```

## Boundaries and flows
- **Client:** all `src/` code executes in the browser. It may use only `VITE_` environment variables and the app-owned data/auth base URLs.
- **Server proxy:** `api/nocodebackend/auth/[...path].js` forwards authentication requests, propagates cookies, strips incoming authorisation headers, and attaches the server-only NoCodeBackend bearer token. Its deployment platform must support the handler contract used by that file.
- **Data:** services map features to NoCodeBackend collections documented in [the schema mapping](nocodebackend/schema-mapping.md). The documented permissions are the authorisation boundary; client-side protected routes only improve navigation.
- **Local state:** React hooks handle transient UI state. Existing `localStorage` use supports preferences and prototype features; it is not a secure data store.

## Authentication and storage
On startup, `useAuth` asks the auth proxy for the session, normalises supported response shapes, and loads a matching profile collection record. Sign-in, sign-up, OTP, Google redirect, and sign-out calls use the proxy. The browser must never receive `NOCODEBACKEND_SECRET_KEY`.

Persistent collections are operated in NoCodeBackend. There is no live SQL database or migration runner in this repository. Archived Supabase SQL files are reference-only and must not be run for new setup.

## Deployment and constraints
The client builds to `dist/` with Vite. The repository does not commit Vercel, Netlify, container, or other hosting configuration, so the actual hosting platform is unverified. Deployment must provide the `api/` handler and configure server-only environment variables. The existing data base URL defaults to `/api/nocodebackend`, but only the auth proxy is implemented here; deployments must supply the corresponding data route or override the browser-safe base URL.
