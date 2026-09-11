# 0003: Public user profiles and rating history

- Status: Accepted
- Date: 2026-09-11

## Context

Pourfolio already has an authenticated owner profile and owner-only rating history. The product now needs profile pages that include rated beers and can show another user's previous ratings.

Persistent `profiles` storage is not yet verified in the deployed provider. Existing rating ownership keys are internal identifiers and must not be reused as public profile URLs. Historical ratings also need an explicit privacy rule before they are shown to other users.

## Decision

- Keep `/profile` owner-scoped, including the owner's complete rating history and owner actions.
- Use `/users/:publicProfileId` for other-user profiles.
- Add a separate opaque, server-generated `public_id` for profile URLs. Internal account identifiers are never used as public profile identity.
- The future profile record contains `public_id`, `name`, optional `description`, optional `avatar_url`, and `rating_history_public`, alongside its server-owned account relationship.
- `rating_history_public` defaults to private. Another user's previous ratings are shown only after explicit opt-in.
- Public profile responses contain only safe display profile fields, rating date and totals, and the product/producer fields needed to render rated beers.
- Public responses exclude email, private account fields, cellar references, detailed rating child rows, and internal workflow fields.
- Public profile routes remain signed-in-only for this scope.
- Until issue #422 is deployed and certified, public profile reads fail closed with `profile_persistence_unavailable`. The application must not fabricate a profile from rating ownership data.

## Consequences

The current owner history remains usable. The public profile UI and response boundary can be implemented now, while activation remains dependent on verified provider persistence and default-private visibility.

## Alternatives considered

Using the internal rating owner key in public URLs was rejected because it couples public identity to account internals. Making all historical ratings public by default was rejected because existing ratings were created under an owner-scoped contract. Fabricating profile identity from rating rows was rejected because rating rows do not contain an authoritative public display profile.

## Links

- #421
- #422
- `docs/nocodebackend/schema-mapping.md`
- `api/profile-data-proxy.js`
- `src/pages/Profile.jsx`
- `src/pages/PublicUserProfile.jsx`
