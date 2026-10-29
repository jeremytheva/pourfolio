# Offline ratings — foundation and release boundaries

Tracking issue: #688. Existing rating-integrity dependency: #165.

## Delivered in the first implementation slice

- Installable web-app manifest and conservative Service Worker cache for the public application shell and Vite assets only. The worker never caches API responses, account data, private images or arbitrary requests.
- The Vite production build injects its complete hashed JavaScript/CSS asset list into the worker, using an asset-derived cache version. Installation waits for all shell assets to be cached before activation so the first offline reload does not lack lazy-loaded rating screens. The allowlist prevents opportunistic caching of unknown paths.
- Static allowlisted assets are looked up with the Cache API's `ignoreVary` option because Vite preview may return `Vary: Origin` and installer fetches do not send the browser module import's `Origin` header. This exception never applies to API or user-specific responses.
- Account/product-scoped IndexedDB form snapshots and rating drafts.
- Previously loaded rating forms can be used offline **when an authenticated client session is already active**.
- Progress saves automatically on the device after edits pause for 350 ms, including incomplete ratings, bonuses, cellar selection and the current card. Save draft remains available on every card. Reopening that beer's rating screen with the same authenticated identity restores the scores, selected bonuses, weights and stable submission identifier.
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


## Review corrections — 26 October 2026

- Draft saves compare a unique revision in the same IndexedDB transaction as the write. Stale tabs cannot overwrite a newer saved draft or recreate a cleared revision. Submission cleanup requires both the submission ID and the exact saved revision; a later save survives an earlier acknowledgement. A conflict blocks upload and offers Load saved draft.
- Each saved draft contains its coherent form snapshot, including newly created bonus definitions and values. Cached recovery uses that snapshot. Unavailable selected definitions fail visibly instead of silently contributing zero.
- Local Save draft always stays local. The separate Submit rating action is disabled offline and connectivity updates reactively. Reconnecting never uploads automatically.
- The client validates a matching completed submission receipt (rating/product identities, completed total and child counts; an echoed submission ID must also match when present) before clearing a saved revision. The current gateway does not echo a submission ID: request association and the server fingerprint remain authoritative, and this client check does not certify provider durability. Empty, malformed or mismatched responses retain recovery data.
- Service Worker updates remain waiting until existing controlled clients close. Controlled navigations use the active cached HTML, keeping that build's document and lazy chunks consistent. Only then may the next worker activate and retire the old cache. There is no forced reload or immediate takeover of an active rating session.

Regression coverage includes stale save/cleanup, coherent bonus recovery, connectivity transitions, empty-success retention and two-version worker updates. Physical mobile and connected provider acceptance remain separate; #165 and public NO-GO are unchanged.

## Automatic local saving — 26 October 2026

The owner requested automatic saving after the manual offline test. The earlier
version saved only when explicitly requested or before online submission. It
could therefore lose unfinished work before review; this slice closes that gap.

- One serial writer per owner/product editor coalesces rapid changes. Every write
  uses the revision returned by its predecessor, preserving cross-tab conflict
  checks. A newer edit is never labelled saved by an older in-flight save.
- Visibility loss, page hide and SPA navigation request a flush of the last
  captured edit. Browser termination, eviction or closing before the save
  completes can still interrupt persistence; only the completed Saved message
  confirms local storage. There is no claim of guaranteed saving after a crash.
- Incomplete drafts resume at the saved card, capped at an unanswered required
  card when necessary. Earlier complete drafts without progress metadata remain
  compatible. Opening a form alone never overwrites or creates a blank draft.
- Storage failures show a visible unsaved warning and a manual retry on the
  current card. Conflicts pause the editor's writer until Load saved draft;
  automatic saving never overwrites another tab's revision.
- Manual save and explicit online submission flush the same writer. Inputs are
  disabled during submission. Confirmed completion closes its writer before
  exact-revision cleanup, so a delayed timer cannot recreate the submitted draft.
- Autosave is device-only. It does not submit, sync on reconnection, alter existing
  server ratings or enable background API replay.

Review of the previous attempt: a read-only 30-minute Vercel runtime-log search
for rating submission, the known previous preview's logs, and submission error
clusters returned no matching events. The initial two-hour query exceeded the
plan's retention and was replaced with the supported window. These observations
cannot confirm a specific previous rating or the contents of a phone's local
draft. They do not establish that a server submission succeeded or failed.
