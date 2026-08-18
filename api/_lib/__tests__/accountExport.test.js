import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  ACCOUNT_EXPORT_COLLECTIONS,
  ACCOUNT_EXPORT_FORMAT,
  ACCOUNT_EXPORT_SCHEMA_VERSION,
  buildAccountExportManifest
} from '../accountExport.js'

const generatedAt = '2026-08-15T01:02:03.456Z'
const owner = { id: 'owner-1', email: 'owner@example.test', name: 'Owner' }

const emptySnapshot = () => Object.fromEntries(
  ACCOUNT_EXPORT_COLLECTIONS.map((collection) => [collection, []])
)

const completeSnapshot = () => ({
  profiles: [
    {
      id: 'profile-owner', user_id: owner.id, name: 'Owner Profile', description: 'Private notes',
      avatar_url: null, email: 'must-not-export@example.test', role: 'admin', secret_key: 'hidden'
    },
    {
      id: 'profile-other', user_id: 'other-user', name: 'OTHER-USER-SENTINEL',
      description: 'OTHER-PRIVATE-SENTINEL'
    }
  ],
  ratings: [
    {
      id: 'rating-2', user_id: owner.id, rating_id: 200, product_id: 20, cellar_id: null,
      date_rated: '2026-08-14T11:12:13+10:00', total_unweighted: '4.5', total_weighted: 4.25,
      submission_state: 'deleted', deleted_at: '2026-08-15T00:00:00Z',
      submission_key: 'owner-1:200', submission_fingerprint: 'hidden', submission_version: 9
    },
    {
      id: 'rating-1', user_id: owner.id, rating_id: 100, product_id: 10, cellar_id: 'cellar-1',
      date_rated: '2026-08-13T01:02:03.000Z', total_unweighted: 6, total_weighted: 5.75,
      submission_state: 'complete', deleted_at: null, expected_score_count: 1
    },
    {
      id: 'rating-other', user_id: 'other-user', rating_id: 300, product_id: 99, cellar_id: null,
      date_rated: '2026-08-12T00:00:00.000Z', total_unweighted: 7, total_weighted: 7,
      submission_state: 'complete', notes: 'OTHER-RATING-SENTINEL'
    }
  ],
  rating_scores: [
    {
      id: 'score-2', user_id: owner.id, rating_id: 'rating-2', attribute_id: 'attribute-2',
      attribute_score: 4, uniqueness_key: 'hidden-score-key'
    },
    {
      id: 'score-1', user_id: owner.id, rating_id: 'rating-1', attribute_id: 'attribute-1',
      attribute_score: 6, secret_key: 'hidden-score-secret'
    },
    {
      id: 'score-other', user_id: 'other-user', rating_id: 'rating-other', attribute_id: 'attribute-99',
      attribute_score: 7, notes: 'OTHER-SCORE-SENTINEL'
    }
  ],
  bonus_attribute_rating_mapping: [
    {
      id: 'mapping-1', user_id: owner.id, rating_id: 'rating-1', bonus_attributes_id: 'bonus-1',
      uniqueness_key: 'hidden-bonus-key'
    },
    {
      id: 'mapping-other', user_id: 'other-user', rating_id: 'rating-other',
      bonus_attributes_id: 'bonus-99', notes: 'OTHER-BONUS-SENTINEL'
    }
  ],
  cellar: [
    {
      id: 'cellar-1', user_id: owner.id, product_id: 10, location_id: null, quantity: '2', mls: 375,
      container: 'Bottle', purchase_price: '12.50', retail_price: null, date_received: '2026-08-01',
      sharing_series_id: null, series_version_id: null, purchase_location_id: 8, purchased_by_id: null,
      gift: 0, gift_from: null, bet_id: null, notes: '</script><script>inert JSON data</script>',
      secret_key: 'hidden-cellar-secret'
    },
    {
      id: 'cellar-other', user_id: 'other-user', product_id: 99, quantity: 1,
      notes: 'OTHER-CELLAR-SENTINEL'
    }
  ],
  products: [
    {
      id: 20, product_name: 'Second Beer', product_category_id: 2, producer_id: 2,
      abv: '5.2', ibu: 30, declared_category: 'Lager', edition: null, collaboration: null,
      product_image: 'https://not-required.example/image.png', secret_key: 'hidden-product-secret'
    },
    {
      id: 10, product_name: '</script><script>inert product name</script>', product_category_id: 1,
      producer_id: 1, abv: 6, ibu: null, declared_category: 'Ale', edition: '2026',
      collaboration: 'Guest Brewer', internal_notes: 'hidden-product-notes'
    },
    { id: 99, product_name: 'OTHER-PRODUCT-SENTINEL', product_category_id: 99, producer_id: 99 }
  ],
  producers: [
    { id: 2, producer_name: 'Producer Two', address: 'not needed' },
    { id: 1, producer_name: 'Producer One', secret_key: 'hidden-producer-secret' },
    { id: 99, producer_name: 'OTHER-PRODUCER-SENTINEL' }
  ],
  categories: [
    { id: 2, category_name: 'Lager', parent_id: 500 },
    { id: 1, category_name: 'Ale', secret_key: 'hidden-category-secret' },
    { id: 99, category_name: 'OTHER-CATEGORY-SENTINEL' }
  ],
  rating_attributes: [
    {
      id: 'attribute-2', category_id: 2, attribute_name: 'Aroma', is_scored: 1,
      weighting: '0.5', secret_key: 'hidden-attribute-secret'
    },
    { id: 'attribute-1', category_id: 1, attribute_name: 'Taste', is_scored: true, weighting: 1 },
    { id: 'attribute-99', category_id: 99, attribute_name: 'OTHER-ATTRIBUTE-SENTINEL', is_scored: 1 }
  ],
  bonus_attributes: [
    { id: 'bonus-1', description: 'Would drink again', point_value: '0.25', secret_key: 'hidden-bonus-secret' },
    { id: 'bonus-99', description: 'OTHER-BONUS-ATTRIBUTE-SENTINEL', point_value: 10 }
  ]
})

const build = (snapshot = completeSnapshot(), account = owner) => buildAccountExportManifest({
  account,
  snapshot,
  generatedAt
})

test('builds a versioned, reconciled and deterministically ordered owner export', () => {
  const manifest = build()

  assert.equal(manifest.format, ACCOUNT_EXPORT_FORMAT)
  assert.equal(manifest.schema_version, ACCOUNT_EXPORT_SCHEMA_VERSION)
  assert.equal(manifest.generated_at, generatedAt)
  assert.deepEqual(manifest.account, owner)
  assert.deepEqual(manifest.record_counts, {
    profiles: 1,
    ratings: 2,
    rating_scores: 2,
    bonus_attribute_rating_mapping: 1,
    cellar: 1,
    products: 2,
    producers: 2,
    categories: 2,
    rating_attributes: 2,
    bonus_attributes: 1
  })
  assert.deepEqual(manifest.data.ratings.map(({ id }) => id), ['rating-1', 'rating-2'])
  assert.deepEqual(manifest.data.rating_scores.map(({ id }) => id), ['score-1', 'score-2'])
  assert.deepEqual(manifest.data.catalogue.products.map(({ id }) => id), ['10', '20'])
  assert.deepEqual(manifest.data.catalogue.rating_attributes.map(({ id }) => id), ['attribute-1', 'attribute-2'])

  assert.deepEqual(manifest.data.ratings[0], {
    id: 'rating-1',
    rating_id: 100,
    product_id: '10',
    cellar_id: 'cellar-1',
    date_rated: '2026-08-13T01:02:03.000Z',
    total_unweighted: 6,
    total_weighted: 5.75,
    submission_state: 'complete',
    deleted_at: null
  })
  assert.deepEqual(manifest.data.ratings[1], {
    id: 'rating-2',
    rating_id: 200,
    product_id: '20',
    cellar_id: null,
    date_rated: '2026-08-14T01:12:13.000Z',
    total_unweighted: 4.5,
    total_weighted: 4.25,
    submission_state: 'deleted',
    deleted_at: '2026-08-15T00:00:00.000Z'
  })
  assert.equal(manifest.data.cellar[0].gift, false)
  assert.equal(manifest.data.cellar[0].date_received, '2026-08-01')
  assert.equal(manifest.data.cellar[0].purchase_price, 12.5)
  assert.deepEqual(manifest.monetary_values, {
    fields: ['cellar.purchase_price', 'cellar.retail_price'],
    currency: null,
    status: 'not_recorded_in_source_schema'
  })

  assert.deepEqual(build(), manifest)
})

test('uses explicit projections and excludes all other-user and provider-only data', () => {
  const manifest = build()
  const json = JSON.stringify(manifest)

  for (const forbidden of [
    'OTHER-', 'secret_key', 'user_id', 'submission_key', 'submission_fingerprint',
    'submission_version', 'uniqueness_key', 'expected_score_count', 'internal_notes',
    'product_image', 'must-not-export@example.test'
  ]) {
    assert.equal(json.includes(forbidden), false, `${forbidden} must not be exported`)
  }

  assert.equal(manifest.data.cellar[0].notes, '</script><script>inert JSON data</script>')
  assert.equal(
    manifest.data.catalogue.products[0].product_name,
    '</script><script>inert product name</script>'
  )
  assert.deepEqual(JSON.parse(json), manifest, 'untrusted text remains ordinary JSON string data')
})

test('produces a complete empty export and omits unrelated catalogue context', () => {
  const snapshot = emptySnapshot()
  snapshot.products.push({ id: 99, product_name: 'Unreferenced' })
  snapshot.producers.push({ id: 99, producer_name: 'Unreferenced' })
  snapshot.categories.push({ id: 99, category_name: 'Unreferenced' })
  snapshot.rating_attributes.push({ id: 99, attribute_name: 'Unreferenced' })
  snapshot.bonus_attributes.push({ id: 99, description: 'Unreferenced' })

  const manifest = build(snapshot, { id: owner.id })

  assert.deepEqual(manifest.account, { id: owner.id, email: null, name: null })
  assert.deepEqual(manifest.data, {
    profiles: [], ratings: [], rating_scores: [], bonus_attribute_rating_mapping: [], cellar: [],
    catalogue: { products: [], producers: [], categories: [], rating_attributes: [], bonus_attributes: [] }
  })
  assert.ok(Object.values(manifest.record_counts).every((count) => count === 0))
})

test('filters a complete other-user snapshot before choosing catalogue context', () => {
  const snapshot = completeSnapshot()
  snapshot.profiles = snapshot.profiles.filter(({ user_id }) => user_id !== owner.id)
  snapshot.ratings = snapshot.ratings.filter(({ user_id }) => user_id !== owner.id)
  snapshot.rating_scores = snapshot.rating_scores.filter(({ user_id }) => user_id !== owner.id)
  snapshot.bonus_attribute_rating_mapping = snapshot.bonus_attribute_rating_mapping
    .filter(({ user_id }) => user_id !== owner.id)
  snapshot.cellar = snapshot.cellar.filter(({ user_id }) => user_id !== owner.id)

  const manifest = build(snapshot)

  assert.ok(Object.values(manifest.record_counts).every((count) => count === 0))
  assert.equal(JSON.stringify(manifest).includes('OTHER-'), false)
})

test('rejects missing, malformed and partially supplied snapshot collections', () => {
  const missing = completeSnapshot()
  delete missing.bonus_attributes
  assert.throws(() => build(missing), /bonus_attributes is missing or invalid/)

  const malformed = completeSnapshot()
  malformed.cellar = {}
  assert.throws(() => build(malformed), /cellar is missing or invalid/)

  const badRecord = completeSnapshot()
  badRecord.products.push(null)
  assert.throws(() => build(badRecord), /products contains an invalid record/)
})

test('rejects duplicate identifiers before producing an ambiguous manifest', () => {
  const snapshot = completeSnapshot()
  snapshot.products.push({ id: 10, product_name: 'Ambiguous duplicate' })

  assert.throws(() => build(snapshot), /products contains duplicate record identifier 10/)
})

test('rejects owned rating children whose parent is unavailable to the owner', () => {
  const snapshot = completeSnapshot()
  snapshot.rating_scores[0].rating_id = 'rating-other'

  assert.throws(() => build(snapshot), /Owned rating child references unavailable rating rating-other/)
})

test('rejects missing referenced catalogue and rating-definition context', () => {
  const cases = [
    ['products', 0, /products record 20 is missing/],
    ['producers', 0, /producers record 2 is missing/],
    ['categories', 0, /categories record 2 is missing/],
    ['rating_attributes', 0, /rating_attributes record attribute-2 is missing/],
    ['bonus_attributes', 0, /bonus_attributes record bonus-1 is missing/]
  ]

  for (const [collection, index, expected] of cases) {
    const snapshot = completeSnapshot()
    snapshot[collection].splice(index, 1)
    assert.throws(() => build(snapshot), expected)
  }
})

test('rejects missing or cross-product owner cellar relationships', () => {
  const missing = completeSnapshot()
  missing.cellar = missing.cellar.filter(({ id }) => id !== 'cellar-1')
  assert.throws(() => build(missing), /unavailable cellar record cellar-1/)

  const mismatched = completeSnapshot()
  mismatched.cellar[0].product_id = 20
  assert.throws(() => build(mismatched), /reference different products/)
})

test('rejects invalid lifecycle values, scores and ISO dates', () => {
  const invalidState = completeSnapshot()
  invalidState.ratings[0].submission_state = 'complete-ish'
  assert.throws(() => build(invalidState), /submission state is invalid/)

  const invalidScore = completeSnapshot()
  invalidScore.rating_scores[0].attribute_score = 8
  assert.throws(() => build(invalidScore), /attribute score is invalid/)

  const invalidRatingDate = completeSnapshot()
  invalidRatingDate.ratings[0].date_rated = 'not-a-date'
  assert.throws(() => build(invalidRatingDate), /Rating date is invalid/)

  const invalidCellarDate = completeSnapshot()
  invalidCellarDate.cellar[0].date_received = '2026-02-30'
  assert.throws(() => build(invalidCellarDate), /Cellar received date is invalid/)

  const invalidText = completeSnapshot()
  invalidText.products[0].product_name = { raw: 'provider envelope' }
  assert.throws(() => build(invalidText), /text export field is invalid/)

  const invalidId = completeSnapshot()
  invalidId.ratings[0].product_id = { id: 20 }
  assert.throws(() => build(invalidId), /optional relationship identifier is invalid/)

  assert.throws(
    () => buildAccountExportManifest({ account: owner, snapshot: completeSnapshot(), generatedAt: 'invalid' }),
    /generation time is invalid/
  )
})

test('allows no profile but rejects multiple exact-owner profiles', () => {
  const noProfile = completeSnapshot()
  noProfile.profiles = noProfile.profiles.filter(({ user_id }) => user_id !== owner.id)
  assert.equal(build(noProfile).record_counts.profiles, 0)

  const duplicateOwner = completeSnapshot()
  duplicateOwner.profiles.push({ id: 'second-owner-profile', user_id: owner.id, name: 'Duplicate' })
  assert.throws(() => build(duplicateOwner), /multiple owned profiles/)
})

test('keeps the source-only builder free of provider access and unreachable from HTTP or browser routes', async () => {
  const [builderSource, dataProxySource, clientSource, appSource] = await Promise.all([
    readFile(new URL('../accountExport.js', import.meta.url), 'utf8'),
    readFile(new URL('../../data-proxy.js', import.meta.url), 'utf8'),
    readFile(new URL('../../../src/lib/nocodeBackend.js', import.meta.url), 'utf8'),
    readFile(new URL('../../../src/App.jsx', import.meta.url), 'utf8')
  ])

  for (const pattern of [/\bfetch\s*\(/, /dataProvider/, /process\.env/]) {
    assert.doesNotMatch(builderSource, pattern)
  }
  for (const reachableSource of [dataProxySource, clientSource, appSource]) {
    assert.doesNotMatch(reachableSource, /accountExport|account-export/)
  }
})