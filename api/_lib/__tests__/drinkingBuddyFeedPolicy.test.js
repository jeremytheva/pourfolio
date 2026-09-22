import assert from 'node:assert/strict';
import test from 'node:test';

import { projectDrinkingBuddyFeed } from '../drinkingBuddyFeedPolicy.js';

const candidate = (overrides = {}) => ({
  feedOptIn: true,
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
  },
  profile: { public_id: 'owner-public', display_name: 'Owner', email: 'private@example.test' },
  product: { public_id: 'beer-1', product_name: 'Beer One', purchase_price: 12.5 },
  producer: { public_id: 'producer-1', producer_name: 'Producer One' },
  ...overrides,
});

test('feed is fail closed unless the feed and owner event opt-in are explicit', () => {
  assert.deepEqual(projectDrinkingBuddyFeed({ viewerUserId: 'viewer', candidates: [candidate()] }), []);
  assert.deepEqual(projectDrinkingBuddyFeed({ viewerUserId: 'viewer', feedEnabled: true, candidates: [candidate({ feedOptIn: false })] }), []);
  assert.equal(projectDrinkingBuddyFeed({ viewerUserId: 'viewer', feedEnabled: true, candidates: [candidate()] }).length, 1);
});

test('current visibility, relationship and either-direction block are rechecked per event', () => {
  const denied = [
    candidate({ relationshipState: 'pending' }),
    candidate({ viewerBlockedOwner: true }),
    candidate({ ownerBlockedViewer: true }),
    candidate({ event: { ...candidate().event, visibility: 'private' } }),
    candidate({ event: { ...candidate().event, visibility: undefined } }),
  ];
  assert.deepEqual(projectDrinkingBuddyFeed({ viewerUserId: 'viewer', feedEnabled: true, candidates: denied }), []);
});

test('feed keeps only the share-safe projection and never leaks private rating context', () => {
  const feed = projectDrinkingBuddyFeed({ viewerUserId: 'viewer', feedEnabled: true, candidates: [candidate()] });
  assert.equal(feed.length, 1);
  const json = JSON.stringify(feed);
  for (const forbidden of ['purchase_price', '12.5', 'cellar', 'private note', 'private@example.test']) {
    assert.equal(json.includes(forbidden), false, forbidden);
  }
});

test('feed is newest-first, rejects invalid timestamps and caps requested page size', () => {
  const candidates = Array.from({ length: 55 }, (_, index) => candidate({
    event: { ...candidate().event, date_rated: `2026-09-${String((index % 22) + 1).padStart(2, '0')}T10:00:00Z` },
    product: { public_id: `beer-${index}`, product_name: `Beer ${index}` },
  }));
  candidates.push(candidate({ event: { ...candidate().event, date_rated: 'not-a-date' } }));

  const feed = projectDrinkingBuddyFeed({ viewerUserId: 'viewer', feedEnabled: true, candidates, limit: 100 });
  assert.equal(feed.length, 50);
  assert.ok(Date.parse(feed[0].eventTimestamp) >= Date.parse(feed.at(-1).eventTimestamp));
});

test('public events are not smuggled through the buddy feed', () => {
  const publicCandidate = candidate({ event: { ...candidate().event, visibility: 'public' } });
  assert.deepEqual(projectDrinkingBuddyFeed({ viewerUserId: 'viewer', feedEnabled: true, candidates: [publicCandidate] }), []);
});
