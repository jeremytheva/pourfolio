# ADR 0006: Adopt Brew Done It deduction-board gameplay

- Status: Accepted
- Date: 2026-09-11
- Supersedes: the question, guess-outcome and scoring portions of [ADR 0002](0002-approve-brew-done-it-cross-device.md)
- Retains from ADR 0002: persistent two-account/two-device series, protected secret beer, invitation/resume model, role rotation, idempotency/versioning and server-authoritative state

## Context

The persistent cross-device architecture approved in ADR 0002 is correct, but the initial interaction model was too rigid. Brew Done It is played socially: the guesser asks whatever yes/no question is useful, the selector answers it, and the guesser progressively narrows the brewery and beer. Exact beer identification is often impractical, so identifying the beer style/category is a meaningful fallback result.

A controlled list of server-submitted questions also created the wrong incentive because questions reduced the score. Useful conversation should help the game rather than be discouraged.

## Decision

Brew Done It becomes a persistent **deduction-board game**.

### Round objective

The guesser works toward two related outcomes:

1. identify the brewery; and
2. identify the exact beer, with the beer style/category available as a fallback when the exact beer cannot reasonably be solved.

The selector still chooses one protected catalogue beer before the challenge is shared.

### Conversation is not a game action

Players may ask natural yes/no questions outside the application action model. Pourfolio does not attempt to model or score every sentence. Questions therefore do not consume a turn and do not directly reduce score.

Examples include:

- “Is the brewery in NSW?”
- “Have I rated beer from this brewery before?”
- “Is the ABV at least 6%?”
- “Is it dark?”
- “Is it barrel aged?”

### Persistent deduction board

The guesser may record useful answers as structured deductions. Each deduction records a dimension, `yes` / `no` / `unknown`, and the relevant value where applicable.

Initial dimensions include:

- brewery country/state when a governed geography source exists;
- whether the guesser has previously rated beer from that brewery;
- brewery exclusions;
- style/category;
- ABV threshold;
- IBU threshold;
- collaboration;
- dark;
- barrel aged; and
- beer exclusions.

`unknown` never eliminates a candidate. Missing catalogue data must not be interpreted as `no`.

The UI presents this workspace as two accessible sides/tabs: **Brewery** and **Beer / Style**. Catalogue-backed deductions narrow candidate counts. State/country remain unavailable for automatic narrowing until canonical geography is governed and certified. Traits without certified structured source data may be recorded as notes but must not automatically eliminate candidates.

### Selector answer sheet

The selector may receive private server-projected information about the protected beer sufficient to answer the guesser accurately, including:

- brewery name and any governed/certified location fields;
- beer name, style/category, ABV, IBU, collaboration and edition; and
- supported clue traits.

This selector-only projection must never be returned to the active guesser. Location fields must remain unknown rather than inferred from free-text addresses or unsupported provider collections.

### Rating-history clues

A participant may opt in to allowing their opponent, while acting as selector, to receive **aggregate** rating-history clues about the hidden answer. Approved aggregates include counts, distinct-beer counts, average weighted rating and last-rated date for:

- the hidden brewery;
- the hidden style; and
- the exact hidden beer.

The selector does not receive the participant's raw rating list, notes, cellar contents or unrelated private account data. The preference is participant-controlled and stored with the persistent series.

### Formal outcomes and scoring

Only formal brewery/beer/style submissions affect score. Scoring version **3.0.0** is:

- correct brewery: 4 points;
- correct exact beer: 6 additional points;
- correct style fallback when the exact beer is not solved: 3 points instead of the exact-beer component;
- each incorrect formal submission: minus 1 point; and
- score clamped to 0–10.

Thus brewery + exact beer can score 10, while brewery + style can score 7 before penalties.

A correct exact beer also confirms the brewery. A style result is a fallback and does not stack with exact-beer points.

The guesser explicitly finishes the round to bank the result achieved so far. A round may therefore finish as `exact_beer`, `style_fallback`, `brewery_only`, `unsolved`, or `forfeit`.

### Persistence and recovery

The existing optimistic-version and idempotency design remains. Formal outcome submissions use durable reservation/reconciliation so retries or ambiguous provider failures cannot create duplicate penalties, outcomes or scores. Deduction-board updates persist separately and do not advance formal-submission counters.

### Trait reliability

Dark/light and barrel-aged are useful game clues, but they must not be inferred from names or free text. Until a certified structured catalogue field or category-trait mapping is available, those dimensions remain manually recorded `yes` / `no` / `unknown` notes and do not automatically filter the candidate catalogue.

## Consequences

- the v2 controlled-question UI/API is superseded for new play;
- the legacy `brew_done_it_questions` source may remain temporarily for migration/history compatibility but is not part of the v3 provider target;
- a new `brew_done_it_deductions` collection is required;
- guess rows must distinguish brewery, beer and style submissions;
- round rows must persist brewery/style/beer outcome state and formal-guess penalties;
- long-term statistics distinguish brewery solved, exact beer solved and style fallback solved;
- provider migration/certification must be updated before enablement; and
- production containment remains unchanged until connected two-device, privacy, recovery and accessibility evidence passes.

## Links

- [Product definition](../PRODUCT.md#brew-done-it--persistent-cross-device-deduction-game-currently-contained)
- [Schema target](../nocodebackend/brew-done-it-schema-target.md)
- [Readiness](../BREW_DONE_IT_READINESS.md)
- [Retained cross-device architecture decision](0002-approve-brew-done-it-cross-device.md)