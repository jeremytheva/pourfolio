# Offline ratings — foundation and release boundaries

Tracking issue: #688. Existing rating-integrity dependency: #165.

## Delivered in the first implementation slice

- Installable web-app manifest and conservative Service Worker cache for the public application shell and Vite assets only. The worker never caches API responses, account data, private images or arbitrary requests.
- The Vite production build injects its complete hashed JavaScript/CSS asset list into the worker, using an asset-derived cache version. Installation waits for all shell assets to be cached before activation so the first offline reload does not lack lazy-loaded rating screens. The allowlist prevents opportunistic caching of unknown paths.
- Static allowlisted assets are looked up with the Cache API's `ignoreVary` option because Vite preview may return `Vary: Origin` and installer fetches do not send the browser module import's `Origin` header. This exception never applies to API or user-specific responses.
- Account/product-scoped IndexedDB form snapshots and rating drafts.
- Previously loaded rating forms can be used offline **when an authenticated client session is already active**.
- A user explicitly saves a draft on the review screen; reopening that beer's rating screen with the same authenticated identity restores the same scores, selected bonuses, weights and stable submission identifier.
- On confirmed server submission, the matching draft can be removed. On any uncertain HTTP outcome, the draft remains recoverable. Saving to the device is never represented as a successful backend write.

## Deliberately not implemented

- No automatic/server-side queue replay, Background Sync registration or service-worker credential handling. Provider idempotency and recovery are not yet certified under #165.
- No claim of offline authentication or offline cold-start after all browser tabs are closed: the present server-authoritative session hook needs the server on a fresh load. A future explicit offline-only unlock and device-cache privacy threat model are needed before enabling that.
- No offline custom bonus-attribute creation, offline catalogue discovery, owner cellar modifications or remote product proposals.
- No promise that local browser storage survives user deletion of site data, browser storage eviction or switching devices. Device-only drafts are not backed up.
- No offline rating submission is considered complete or visible in public history.
- No service-worker cache of private application data: the browser holds those per owner in IndexedDB, not CacheStorage.

## Privacy and identity

Local records are keyed to the signed-in user's canonical ID and product ID. They store rating-form data and the user's draft scores, not passwords, tokens, provider keys or session cookies. Account-key separation is not strong encryption against another person with access to the same unlocked browser profile. Do not show another account's drafts; a future offline-unlock mechanism requires a reviewed privacy and threat model.

## Acceptance and certification

- Verify the worker pre-caches all compiled assets and supports a real network-disconnected reload of public routes. Confirm the install fails rather than claiming success if its shell cannot be cached.
- Verify static files cache correctly, while `/api/` never gets intercepted/cached. Any deployment which changes the built asset URL scheme or static routing must requalify the Service Worker.
- Verify a previously loaded rating form opens when connectivity drops without replacing the server session.
- Verify rating drafts survive navigation/reload, preserve submission identity and are scoped to the active user.
- Verify IndexedDB/quota failures show a real error, and confirmed/uncertain submission paths do not misrepresent persistence.
- Verify iOS Safari, installed iOS home screen, Android Chrome and desktop.
- Complete #165 provider uniqueness, distributed child-write integrity and recovery certification before implementing automatic uploads.
- Confirm accessibility, build, Node tests, lint and end-to-end browser cases on the actual candidate head before merge/release.
