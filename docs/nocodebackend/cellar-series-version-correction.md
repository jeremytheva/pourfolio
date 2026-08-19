# Cellar sharing-series relationship correction

## Evidence

The supplied `54026_rating_export(2).sql` and `54026_rating_cellar.csv` define the cellar edition/version relationship as `cellar.series_version_id`. The application UI also reads `series_version_id`. `series_edition_id` is not present in the supplied cellar schema.

The related tables are:

- `cellar.sharing_series_id` → parent sharing series identifier;
- `cellar.series_version_id` → selected sharing-series edition/version identifier;
- `sharing_series_editions.id` → edition/version primary key;
- `sharing_series_editions.series_id` → parent `sharing_series.id`.

Both cellar relationship fields are optional and must remain nullable. Zero is not a valid stand-in for no relationship.

## Repository correction

The browser/API contract uses `series_version_id` for cellar reads and writes. The dedicated cellar gateway projects the same field name and preserves the independent nullable `sharing_series_id` relationship.

## Required NoCodeBackend configuration change

The provider relationship currently tracked by issue #168 must be configured as:

- series relationship: `cellar.sharing_series_id = sharing_series.id`;
- edition/version relationship: `cellar.series_version_id = sharing_series_editions.id`.

Do not join `cellar.sharing_series_id` directly to `sharing_series_editions.id`.

## Existing-data verification

Before closing #168 against production, verify:

1. rows with only `sharing_series_id` continue to resolve the parent series and do not fabricate an edition/version;
2. rows with `series_version_id` resolve that exact `sharing_series_editions.id`;
3. where both values exist, `sharing_series_editions.series_id` matches `cellar.sharing_series_id`;
4. null relationships remain valid;
5. any mismatch is corrected from source evidence rather than by guessing IDs.

The supplied cellar export contains populated `series_version_id` values (for example value `74`), so the repository must not rename or discard this field.
