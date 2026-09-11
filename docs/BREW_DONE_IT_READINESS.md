# Brew Done It readiness

Status: **v3 deduction redesign implemented in contained source; validation and provider migration pending**  
Decision authority: [ADR 0005](DECISIONS/0005-adopt-brew-done-it-deduction-board.md)  
Retained cross-device authority: [ADR 0002](DECISIONS/0002-approve-brew-done-it-cross-device.md)  
Schema target: [Brew Done It persistent schema target](nocodebackend/brew-done-it-schema-target.md)

## Purpose

This is the capability-specific readiness gate for Brew Done It. ADR 0005 supersedes the former controlled-question/scoring model while retaining ADR 0002's persistent two-account/two-device architecture, protected secret, invitation/resume behaviour and concurrency boundary.

Approval of source implementation does **not** approve provider mutation or production enablement.

## Current contained source state

The v3 source now provides:

- persistent two-player series and alternating secret-beer rounds;
- selector-first beer choice and beer-profile **Play Brew-Done-It** preselection contract;
- fail-closed secret-beer server projection;
- asynchronous invitation/share/resume behaviour;
- an accessible two-sided **Brewery / Beer & Style** deduction board;
- persistent `yes` / `no` / `unknown` deduction state across sessions/devices;
- brewery candidate narrowing from the guesser's own previously-rated relationship;
- beer candidate narrowing by remaining brewery field, style, ABV, IBU and collaboration;
- state/country deduction controls deliberately unavailable until canonical brewery geography is governed and certified;
- dark/barrel-aged notes that deliberately do **not** auto-filter until structured trait data is certified;
- selector-only brewery/beer/style answer sheet;
- optional guesser-controlled aggregate rating-history clues for hidden brewery/style/exact beer;
- formal brewery, exact-beer and style-fallback submissions;
- scoring v3.0.0: brewery 4 + exact beer 6, or brewery 4 + style fallback 3, minus 1 per incorrect formal submission, clamped 0–10;
- durable v3 formal-outcome reservation/reconciliation separated from the superseded v2 question/guess reconciler;
- explicit round completion and forfeit;
- v3 longitudinal/head-to-head outcome statistics; and
- absent production route/navigation with `BREW_DONE_IT_POLICY_ENABLED` still unset.

The connected provider schema has not been migrated/certified for v3, so the feature remains unreachable.

## Current implementation state — 12 September 2026

The merged persistent-core baseline is PR #410. The v3 redesign is PR **#461** on `codex/brew-done-it-deduction-v3`.

The branch has been reconciled with current `main` and PR #461 is structurally mergeable, but it remains **IMPLEMENTING / VALIDATION PENDING**. Gameplay, persistence fields, API routing and UI differ materially from the accepted PR #410 exact-head evidence, so PR #410 validation must not be reused as acceptance evidence for v3.

Until v3 validation is explicitly run:

- continue non-provider source/documentation work where useful;
- do not enable a playable route/navigation or policy flag;
- do not create/change provider collections; and
- do not merge PR #461 as MERGE READY.

## Beer-profile entry-point contract

While contained, **Play Brew-Done-It** on the beer profile remains informational and performs no game API request. Once separately enabled, it passes the viewed canonical product as a reviewable initial secret-beer selection. The selector may change the beer before creating the challenge, and server product validation remains authoritative.

The selected beer must never be encoded into an invitation or guesser-facing payload.

## Governed clue-data boundary

Candidate narrowing must use only governed/certified facts.

Currently supported source-backed narrowing includes:

- producer relationship from canonical product data;
- whether the authenticated guesser has previously rated a beer from that producer;
- product category/style;
- ABV;
- IBU; and
- collaboration.

Current source does **not** treat producer free-text address/suburb identifiers as sufficient authority for state/country. Therefore state/country controls remain unavailable and geography fields in the selector sheet remain unknown until a canonical geography source is governed and certified.

Dark and barrel-aged are useful social clues, but remain manual notes only until trustworthy structured trait metadata exists. Missing information must never be interpreted as `no`.

## Provider migration gate

Before a connected provider mutation, retain evidence for:

1. the exact v3 schema and field/index plan;
2. provider support for required create/update/filter/compare-and-set behaviour;
3. backup/restore or disposable-environment recovery;
4. permissions preventing direct enumeration and secret disclosure;
5. cleanup procedure for disposable test accounts/fixtures;
6. rollback/abort criteria; and
7. explicit owner approval for provider mutation.

Do not infer provider support from application source alone.

## Required v3 Brew Done It collections

The migration target is:

- `brew_done_it_games`;
- `brew_done_it_rounds`;
- `brew_done_it_guesses`; and
- `brew_done_it_deductions`.

`brew_done_it_questions` belongs to the superseded v2 model and is not required for new v3 play.

Existing governed product/producer/category/rating data may support deduction options and selector aggregates. Geography is not a v3 migration prerequisite and must remain unavailable until separately governed. Full field and recovery semantics are in the schema target.

## Connected certification

Use dedicated non-personal test accounts and disposable fixtures where possible.

### Authentication, ownership and privacy

Prove:

- unauthenticated requests fail;
- only the two participants access their series/rounds;
- unrelated users cannot enumerate another game, deduction or formal guess;
- the creator cannot join their own invitation as opponent;
- browser-supplied participant/correctness/score fields are ignored/rejected;
- only the selector receives the private answer sheet;
- active guesser raw HTTP responses contain no `selected_product_id`, answer-sheet data or equivalent secret; and
- the secret is revealed only after terminal state.

### Rating-history consent

With history sharing **off**, prove selector clue responses contain no hidden-answer rating aggregates for that guesser.

With sharing **on**, prove only approved aggregates are returned:

- rating count;
- distinct-beer count;
- average weighted rating; and
- last-rated date

for the hidden brewery/style/exact beer. Raw ratings, rating notes, cellar records and unrelated account data must remain absent.

### Deduction board

Using two authenticated devices:

1. Player A selects a beer and creates a challenge.
2. Player B accepts on another device.
3. Player B records previous-brewery-history/style/ABV/IBU/collaboration deductions.
4. Refresh/sign-out/device change preserves the deduction board.
5. `yes` and `no` narrow only according to certified facts; `unknown` eliminates nothing.
6. brewery and beer candidate counts remain consistent with stored deductions.
7. geography is visibly unavailable rather than inferred while no governed source exists.
8. dark/barrel-aged can be recorded but do not auto-filter before certified trait metadata exists.
9. Player B may submit brewery, exact-beer and style-fallback outcomes without the conversation itself becoming scored actions.

### Scoring and lifecycle

Prove scoring v3.0.0 exactly:

- brewery correct = 4;
- brewery + exact beer = 10 before penalties;
- brewery + style fallback = 7 before penalties;
- style does not stack with exact-beer points;
- each incorrect formal submission costs 1;
- ordinary questions/deductions cost 0;
- score never leaves 0–10;
- exact beer confirms brewery;
- explicit finish persists exactly one terminal result; and
- terminal outcomes/statistics reconcile to round rows.

### Concurrency and recovery

Inject failures:

- after formal-outcome reservation but before guess-child creation;
- after child persistence but before round finalisation;
- after round finalisation but before child commit marker;
- during identical retries; and
- during stale second-device submissions.

Prove:

- at most one committed logical formal outcome exists;
- an empty reservation creates no formal turn/penalty;
- v3 `outcome:*` reservations are reconciled only by the v3 outcome reconciler;
- retries recover deterministically by idempotency key;
- stale versions fail safely;
- no score/penalty duplicates; and
- resume/game-detail/forfeit cannot accidentally execute the legacy v2 exact-beer reconciliation semantics.

### Asynchronous series flow

Prove create → join → resume → deductions → formal outcomes → explicit finish → reveal → role swap → next round across different authenticated sessions/devices over elapsed time. Head-to-head brewery/exact-beer/style/point totals must reconcile after repeated rounds.

### Accessibility and browser evidence

Before route enablement:

- add the enabled route to the browser test matrix only after provider migration exists;
- run automated WCAG 2.2 AA checks for challenge list, create/join, selector answer sheet, both deduction-card sides, formal outcomes, completion and recovery states;
- verify keyboard operation and visible focus for all deduction controls;
- verify status/live-region announcements for save, formal result, stale conflict, completion and invite actions; and
- manually inspect screen-reader labels and secret-sensitive state transitions.

## Enablement gate

Only a separate reviewed enablement change may:

- make beer-profile **Play Brew-Done-It** navigate into play;
- add `/brew-done-it` to application routing/navigation;
- set/require `BREW_DONE_IT_POLICY_ENABLED=true`; or
- promote Brew Done It collections from deferred to deployed contract.

That change requires provider, privacy, cross-device, scoring, recovery, accessibility and cleanup evidence attributable to the exact candidate revision.

## Current blockers

Brew Done It v3 enablement is blocked by its own capability boundary, not by unrelated launch work:

- v3 provider collections/fields are not certified/deployed;
- rating-history consent/privacy behaviour is not connected-certified;
- v3 formal-outcome recovery has not been failure-injection tested against NoCodeBackend;
- two-account/two-device v3 evidence does not yet exist;
- canonical brewery geography is unavailable for geography-based narrowing; and
- no reviewed enablement change exists.

These blockers remain scoped to Brew Done It and must not block unrelated Pourfolio launch work.
