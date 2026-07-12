# NoCodeBackend schema mapping

## Decision

`src/supabase/migrations/` has been removed from the application source tree. The project now treats NoCodeBackend as the active backend, keeps the former Supabase SQL files only as historical reference under `docs/archive/supabase-migrations/`, and documents the runtime schema here so setup no longer depends on replaying Supabase migrations.

## Setup expectations

1. Create the collections below in NoCodeBackend before running the app against shared data.
2. Configure `VITE_NOCODEBACKEND_API_BASE_URL` for browser data calls when the default `/api/nocodebackend` route is not used.
3. Keep `NOCODEBACKEND_SECRET_KEY` server-side only and expose authenticated auth operations through `/api/nocodebackend/auth/*`.
4. Use `created_at` and `updated_at` timestamp fields on mutable collections. If NoCodeBackend does not auto-maintain `updated_at`, update it in the API workflow or automation for each write.

## Collection summary

| Supabase table / app collection | NoCodeBackend collection | Purpose | Primary relationships |
| --- | --- | --- | --- |
| `profiles` | `profiles` | User profile and role data. | `id` is the authenticated user id; referenced by ratings, claims, cellar items, venue managers, and event creators. |
| `producer_claims_pf2025` | `producer_claims_pf2025` | Producer ownership claim workflow. | `user_id` and `reviewed_by` reference `profiles.id`; `producer_id` references `producers_pf2025.id` when known. |
| `beverages_pf2025` | `beverages_pf2025` | Beverage catalog. | `producer_id` references `producers_pf2025.id`; ratings and cellar items reference beverages. |
| producers | `producers_pf2025` | Breweries, wineries, distilleries, and other beverage producers. | Referenced by beverages and producer claims. |
| `ratings_pf2025` | `ratings_pf2025` | User beverage ratings and notes. | `user_id` references `profiles.id`; `beverage_id` references `beverages_pf2025.id`. |
| venues | `venues_pf2025` | Venue directory and management metadata. | Manager/owner ids reference `profiles.id`; events can embed or reference venues. |
| events | `events_pf2025` | Festivals, tastings, launches, and venue events. | `created_by` references `profiles.id`; venue references should point to `venues_pf2025.id` or embed venue summaries when needed by the UI. |
| cellar items | `cellar_items_pf2025` | User cellar inventory. | `user_id` references `profiles.id`; `beverage_id` references `beverages_pf2025.id`. |

## Collection definitions

### `profiles`

Fields migrated from the former Supabase profile migration:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/string | Yes | Must equal the authenticated user id. |
| `email` | Email/string | Yes | Unique. |
| `name` | String | Yes | Display name. |
| `type` | Enum/string | Yes | Default `General User`; include `Admin User` for administrative access. |
| `description` | Text/string | No | Default empty string. |
| `avatar_url` | URL/string | No | Public avatar URL. |
| `created_at` | Datetime | Yes | Default now. |
| `updated_at` | Datetime | Yes | Update on each profile change. |

Permissions:

- Authenticated users can create, read, and update their own profile where `auth.user.id == id`.
- Authenticated users may read public profile summary fields (`id`, `name`, `avatar_url`, and role fields needed by admin checks) for relationship hydration.
- Only admins should be allowed to change another user's `type`.

### `producer_claims_pf2025`

Fields migrated from the former Supabase claims migration:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/string | Yes | Generated id. |
| `user_id` | UUID/string | Yes | References `profiles.id`; cascade/delete or deny when a profile is removed. |
| `producer_id` | UUID/string | No | References `producers_pf2025.id` after a producer is matched. |
| `producer_name` | String | Yes | Submitted producer name. |
| `business_license` | String | No | Sensitive business verification detail. |
| `tax_id` | String | No | Sensitive; restrict read access to submitter and admins. |
| `contact_email` | Email/string | Yes | Claim contact. |
| `contact_phone` | String | No | Optional claim contact. |
| `status` | Enum/string | Yes | One of `pending`, `approved`, `rejected`, `under_review`; default `pending`. |
| `admin_notes` | Text/string | No | Required by the app when admins update a status. |
| `reviewed_by` | UUID/string | No | References admin `profiles.id`. |
| `reviewed_at` | Datetime | No | Set during admin review. |
| `created_at` | Datetime | Yes | Default now. |
| `updated_at` | Datetime | Yes | Update on each claim change. |

Permissions:

- Authenticated users can create claims only with `user_id == auth.user.id`.
- Authenticated users can read their own claims.
- Admin users can read all claims and update review fields/status.
- Non-admin users cannot modify `status`, `admin_notes`, `reviewed_by`, or `reviewed_at`.

### `producers_pf2025`

Recommended fields based on current app relationship usage:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/string | Yes | Generated id. |
| `name` | String | Yes | Searchable and sortable. |
| `type` | Enum/string | Yes | Brewery, winery, distillery, cidery, meadery, etc. |
| `location` | String | No | Summary location used by producer relationship hydration. |
| `city` | String | No | Optional structured location. |
| `state` | String | No | Optional structured location. |
| `country` | String | No | Optional structured location. |
| `description` | Text/string | No | Producer profile copy. |
| `website` | URL/string | No | Public website. |
| `logo_url` | URL/string | No | Producer logo. |
| `claimed_by` | UUID/string | No | References owner `profiles.id` after a claim is approved. |
| `created_at` | Datetime | Yes | Default now. |
| `updated_at` | Datetime | Yes | Update on each producer change. |

Permissions:

- Public/authenticated users can read producer records.
- Authenticated users can propose or create records only if product policy allows it.
- Owners referenced by `claimed_by` and admins can update producer profile fields.
- Admins can approve claims and set `claimed_by`.

### `beverages_pf2025`

Recommended fields based on current services and UI relationship usage:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/string | Yes | Generated id. |
| `name` | String | Yes | Searchable. |
| `type` | Enum/string | Yes | Beer, wine, spirits, cider, mead, etc. |
| `style` | String | No | Searchable style/category. |
| `producer_id` | UUID/string | Yes | References `producers_pf2025.id`. |
| `description` | Text/string | No | Beverage notes. |
| `abv` | Number | No | Alcohol by volume. |
| `ibu` | Number | No | Beer-specific bitterness when applicable. |
| `image_url` | URL/string | No | Label/photo image. |
| `average_rating` | Number | No | Denormalized aggregate if maintained. |
| `rating_count` | Number | No | Denormalized aggregate if maintained. |
| `created_at` | Datetime | Yes | Default now. |
| `updated_at` | Datetime | Yes | Update on each beverage change. |

Permissions:

- Public/authenticated users can read beverage records.
- Producer owners and admins can create/update/delete beverages for producers they manage.
- General users can submit new beverages only if the product workflow supports moderation.

### `ratings_pf2025`

Recommended fields based on rating service relationship usage:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/string | Yes | Generated id. |
| `user_id` | UUID/string | Yes | References `profiles.id`. |
| `beverage_id` | UUID/string | Yes | References `beverages_pf2025.id`. |
| `rating` | Number | Yes | Overall score used by the UI. |
| `notes` | Text/string | No | User tasting notes. |
| `appearance` | Number | No | Attribute rating when present. |
| `aroma` | Number | No | Attribute rating when present. |
| `taste` | Number | No | Attribute rating when present. |
| `mouthfeel` | Number | No | Attribute rating when present. |
| `overall` | Number | No | Attribute rating when present. |
| `created_at` | Datetime | Yes | Default now. |
| `updated_at` | Datetime | Yes | Update on each rating change. |

Permissions:

- Authenticated users can create ratings only with `user_id == auth.user.id`.
- Users can update/delete only their own ratings.
- Public/authenticated users can read ratings and hydrated profile summaries.
- Admins can moderate or delete ratings when policy requires it.

### `venues_pf2025`

Recommended fields based on venue service and local venue-management utilities:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/string | Yes | Generated id. |
| `name` | String | Yes | Searchable and sortable. |
| `type` | Enum/string | Yes | Bar, bottle shop, restaurant, taproom, festival venue, etc. |
| `city` | String | No | Searchable. |
| `state` | String | No | Optional structured location. |
| `country` | String | No | Optional structured location. |
| `address` | String | No | Street address. |
| `description` | Text/string | No | Venue profile copy. |
| `website` | URL/string | No | Public website. |
| `phone` | String | No | Public phone. |
| `owner_id` | UUID/string | No | References `profiles.id`. |
| `manager_ids` | Array/string list | No | References `profiles.id` values for venue managers. |
| `created_at` | Datetime | Yes | Default now. |
| `updated_at` | Datetime | Yes | Update on each venue change. |

Permissions:

- Public/authenticated users can read venues.
- Venue owners/managers and admins can update venue details, managed beverages, staff, replies, and events according to assigned permissions.
- Admins can approve new venues and override ownership disputes.

### `events_pf2025`

Recommended fields based on event service and event UI usage:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/string | Yes | Generated id. |
| `name` | String | Yes | Searchable. |
| `description` | Text/string | Yes | Searchable event description. |
| `type` | Enum/string | No | Festival, tasting, release, meetup, pairing, etc. |
| `beverage_category` | Enum/string | No | Beer, wine, spirits, cider, mead, or all. |
| `start_date` | Datetime/date | Yes | Sort key used by the service. |
| `end_date` | Datetime/date | No | Optional event end. |
| `venues` | Array/object list | No | Embedded venue summaries currently used by UI; include `id`, `name`, and address/location summary. |
| `venue_ids` | Array/string list | No | Prefer this for relational integrity when NoCodeBackend supports it. |
| `created_by` | UUID/string | No | References `profiles.id`. |
| `website` | URL/string | No | Event page. |
| `image_url` | URL/string | No | Event image. |
| `created_at` | Datetime | Yes | Default now. |
| `updated_at` | Datetime | Yes | Update on each event change. |

Permissions:

- Public/authenticated users can read events.
- Venue managers with `create_events`, producer owners, and admins can create events.
- Event creators, associated venue managers, and admins can update events.

### `cellar_items_pf2025`

This collection was not part of the old Supabase migrations but is used by the NoCodeBackend services and should be created alongside the other collections.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | UUID/string | Yes | Generated id. |
| `user_id` | UUID/string | Yes | References `profiles.id`. |
| `beverage_id` | UUID/string | Yes | References `beverages_pf2025.id`. |
| `quantity` | Number | No | Bottle/can count. |
| `added_date` | Datetime/date | Yes | Sort key used by the service. |
| `location` | String | No | Cellar/storage location. |
| `notes` | Text/string | No | User notes. |
| `created_at` | Datetime | Yes | Default now. |
| `updated_at` | Datetime | Yes | Update on each cellar item change. |

Permissions:

- Authenticated users can create/read/update/delete only their own cellar items.
- Admin access should be limited to support workflows because this is private user inventory.

## Relationship implementation notes

NoCodeBackend collection reads do not provide Supabase-style nested relational selects in this app. The frontend preserves the old response shape by making follow-up reads and attaching summary objects such as `producers_pf2025`, `profiles`, `beverages_pf2025`, and `ratings_pf2025` after the base collection request.

## Archived Supabase files

The archived SQL files are reference-only snapshots of the prior Supabase setup:

- `docs/archive/supabase-migrations/1760528332049-create_profiles_table.sql`
- `docs/archive/supabase-migrations/1760528332050-create_producer_claims_table.sql`

Do not run these files as part of new environment setup. Update this NoCodeBackend schema document instead when collections or permissions change.
