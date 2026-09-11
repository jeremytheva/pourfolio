# 0003: Public user profiles and rating history

- Status: Accepted
- Date: 2026-09-11
- Updated: 2026-09-11

## Context

Pourfolio already has authenticated owner-only rating history. The product also needs persistent profile pages that can include rated beers and show another user's previous ratings without exposing authentication identifiers or private owner data.

The owner has now added the canonical `profiles` table in NoCodeBackend and supplied schema evidence showing `id`, unique/non-null `user_id`, unique/non-null `public_id`, required `name`, optional `description` and `avatar_url`, default-private `rating_history_public`, and timestamps. The obsolete singular `profile` table was empty and has been removed.

Existing rating ownership keys remain internal identifiers and must not be reused as public profile URLs. Historical ratings require explicit owner opt-in before they are shown to other users.

## Decision

- Keep `/profile` owner-scoped, including the owner's complete rating history and owner actions.
- Use `/users/:publicProfileId` for other-user profiles.
- Use a separate opaque, server-generated `public_id` for profile URLs. Internal account identifiers are never used as public profile identity.
- The persistent profile record contains `public_id`, `name`, optional `description`, optional `avatar_url`, and `rating_history_public`, alongside its server-owned `user_id` relationship.
- `rating_history_public` defaults to private. Another user's previous ratings are shown only after explicit opt-in.
- The application creates the owner's profile on first owner-profile access if one does not already exist, using the authenticated session identity and a server-generated UUID public identifier.
- Owner updates are allowlisted to `name`, `description`, `avatar_url`, and `rating_history_public`. Browser-supplied `user_id`, `public_id`, role, email, and provider metadata are ignored and cannot replace server-owned identity.
- Public profile responses contain only safe display profile fields, rating date and totals, and the product/producer fields needed to render rated beers.
- Public responses exclude email, internal `user_id`, cellar references, detailed rating child rows, submission/workflow fields, and other private account data.
- Public profile routes remain signed-in-only for this scope.
- If a profile has not opted in to rating-history sharing, the public response returns the safe profile projection with an empty rating history and no rating-provider read.

## Consequences

Persistent owner profile editing and public profile lookup are now application capabilities backed by the canonical `profiles` collection. Existing ratings continue to be owned directly by authenticated `user_id`; they do not need to reference `profiles.id`.

The application retains a compatibility failure for legacy deployments that return a session-only profile without `public_id`. Live provider read/write certification and deployment evidence remain tracked in #422 until verified against the deployed application.

## Alternatives considered

Using the internal rating owner key in public URLs was rejected because it couples public identity to account internals. Making all historical ratings public by default was rejected because existing ratings were created under an owner-scoped contract. Fabricating profile identity from rating rows was rejected because rating rows do not contain an authoritative public display profile.

## Links

- #421
- #422
- `docs/nocodebackend/schema-mapping.md`
- `api/profile-data-proxy.js`
- `src/pages/Profile.jsx`
- `src/pages/PublicUserProfile.jsx`
