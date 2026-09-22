import assert from 'node:assert/strict';
import test from 'node:test';

import { projectSharedTasting } from '../sharedTastingProjection.js';

const base = {
  viewerUserId: 'viewer',
  relationshipState: 'accepted',
  event: {
    user_id: 'owner',
    visibility: 'drinking_buddies',
    event_type: 'full_tasting',
    date_rated: '2026-09-22T10:00:00Z',
    total_weighted: 4.25,
    purchase_price: 12.5,
    cellar_id: 99,
    notes: 'private note',
    venue_id: 42,
    id: 123,
  },
  profile: {
    public_id: 'brewer-jeremy',
    display_name: 'Jeremy',
    avatar_url: 'https://example.test/avatar.jpg',
    email: 'private@example.test',
    id: 7,
  },
  product: {
    public_id: 'beer-abc',
    product_name: 'Example Beer',
    purchase_price: 14,
    id: 8,
  },
  producer: {
    public_id: 'brewery-abc',
    producer_name: 'Example Brewery',
    address: 'private-ish context',
    id: 9,
  },
};

test('projects only the ADR 0007 share-safe fields for an accepted buddy', () => {
  assert.deepEqual(projectSharedTasting(base), {
    profile: {
      publicId: 'brewer-jeremy',
      displayName: 'Jeremy',
      avatarUrl: 'https://example.test/avatar.jpg',
    },
    product: { publicId: 'beer-abc', name: 'Example Beer' },
    producer: { publicId: 'brewery-abc', name: 'Example Brewery' },
    eventType: 'full_tasting',
    eventTimestamp: '2026-09-22T10:00:00Z',
    displayScore: 4.25,
  });
});

test('never leaks price, cellar, note, location, email or internal identifiers', () => {
  const projected = projectSharedTasting(base);
  const json = JSON.stringify(projected);
  for (const forbidden of ['purchase_price', '12.5', 'cellar', 'private note', 'venue', 'private@example.test', 'private-ish context', '"id"']) {
    assert.equal(json.includes(forbidden), false, forbidden);
  }
});

test('fails closed for private, missing relationship, either block and legacy visibility', () => {
  const cases = [
    { event: { ...base.event, visibility: 'private' } },
    { relationshipState: 'pending' },
    { viewerBlockedOwner: true },
    { ownerBlockedViewer: true },
    { event: { ...base.event, visibility: undefined } },
  ];
  for (const override of cases) assert.equal(projectSharedTasting({ ...base, ...override }), null);
});

test('public remains unavailable unless the public surface is separately enabled', () => {
  const input = { ...base, relationshipState: null, event: { ...base.event, visibility: 'public' } };
  assert.equal(projectSharedTasting(input), null);
  assert.ok(projectSharedTasting({ ...input, publicSurfaceEnabled: true }));
});

test('quick rate uses its own display score and incomplete projection data fails closed', () => {
  assert.equal(projectSharedTasting({
    ...base,
    event: { ...base.event, event_type: 'quick_rate', quick_rate_score: 3.5 },
  }).displayScore, 3.5);

  assert.equal(projectSharedTasting({ ...base, product: { ...base.product, public_id: null } }), null);
  assert.equal(projectSharedTasting({ ...base, event: { ...base.event, total_weighted: null } }), null);
});
