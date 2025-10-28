# Pourfolio

Pourfolio is an interactive prototype for exploring beverage collections, events, and venues. The app now includes a Supabase-backed authentication flow and a centralized mock API so the UI behaves closer to a production experience while the real backend is still under construction.

## Requirements

- Node.js 18+
- npm 9+

## Getting started

```bash
npm install
npm run dev
```

The project uses Vite, so the development server will prompt you to open the local URL once it boots.

## Environment variables

Authentication depends on Supabase. Create a `.env` file in the project root with the following values:

```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

If the variables are missing, the app falls back to an offline demo account so you can still explore the UI. Sign in with:

- Email: `demo@pourfolio.app`
- Password: `pourfolio-demo`

## Mock data service

Static datasets (beverages, venues, events, and cellar entries) now live under `src/data/` and are surfaced through a lightweight mock API in `src/utils/api/mockApi.js`. The service provides asynchronous helpers (`getVenues`, `addEvent`, `getCellarEntries`, etc.) that mimic backend latency and persist changes to local storage so the UI can read and write consistently while a real API is being built.

You can reset mock data at any time in the browser console:

```js
import { resetMockData } from './src/utils/api/mockApi';
resetMockData();
```

## Linting and tests

```bash
npm run lint
```

Formal integration tests are not set up yet; focus on linting and manual verification for now.

## Next steps

- Replace the mock API calls with real endpoints once the backend is ready.
- Expand Supabase profiles to capture additional user metadata (roles, avatars, beverage preferences).
- Add automated tests around authentication flows and mock API adapters.
