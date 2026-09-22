import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canonicalBuddyPair,
  canReadSharedTasting,
  canTransitionBuddyRelationship,
  normalizeTastingVisibility,
} from '../tastingSharingPolicy.js';

test('missing and unknown tasting visibility fail closed to private', () => {
  assert.equal(normalizeTastingVisibility(undefined), 'private');
  assert.equal(normalizeTastingVisibility(null), 'private');
  assert.equal(normalizeTastingVisibility('friends'), 'private');
  assert.equal(normalizeTastingVisibility('public'), 'public');
});

test('owner access is independent of social visibility', () => {
  assert.equal(canReadSharedTasting({
    viewerUserId: 'user-1',
    ownerUserId: 'user-1',
    visibility: 'private',
  }), true);
});

test('private and legacy tastings deny non-owner access', () => {
  for (const visibility of ['private', undefined, 'unexpected']) {
    assert.equal(canReadSharedTasting({
      viewerUserId: 'viewer',
      ownerUserId: 'owner',
      visibility,
      relationshipState: 'accepted',
    }), false);
  }
});

test('Drinking Buddy visibility requires current accepted relationship', () => {
  assert.equal(canReadSharedTasting({
    viewerUserId: 'viewer',
    ownerUserId: 'owner',
    visibility: 'drinking_buddies',
    relationshipState: 'accepted',
  }), true);

  for (const relationshipState of [undefined, 'pending', 'declined', 'cancelled', 'removed']) {
    assert.equal(canReadSharedTasting({
      viewerUserId: 'viewer',
      ownerUserId: 'owner',
      visibility: 'drinking_buddies',
      relationshipState,
    }), false);
  }
});

test('either directional block immediately denies buddy access', () => {
  for (const block of [
    { viewerBlockedOwner: true },
    { ownerBlockedViewer: true },
  ]) {
    assert.equal(canReadSharedTasting({
      viewerUserId: 'viewer',
      ownerUserId: 'owner',
      visibility: 'drinking_buddies',
      relationshipState: 'accepted',
      ...block,
    }), false);
  }
});

test('public visibility remains disabled unless the public surface is explicitly enabled', () => {
  assert.equal(canReadSharedTasting({
    viewerUserId: 'viewer',
    ownerUserId: 'owner',
    visibility: 'public',
  }), false);

  assert.equal(canReadSharedTasting({
    viewerUserId: 'viewer',
    ownerUserId: 'owner',
    visibility: 'public',
    publicSurfaceEnabled: true,
  }), true);
});

test('canonical pair is deterministic and rejects self relationships', () => {
  assert.deepEqual(canonicalBuddyPair('z-user', 'a-user'), {
    userLowId: 'a-user',
    userHighId: 'z-user',
  });
  assert.deepEqual(canonicalBuddyPair('a-user', 'z-user'), {
    userLowId: 'a-user',
    userHighId: 'z-user',
  });
  assert.equal(canonicalBuddyPair('same', 'same'), null);
});

test('pending relationship transitions are role-authorized', () => {
  const base = {
    state: 'pending',
    requesterUserId: 'requester',
    recipientUserId: 'recipient',
  };

  assert.equal(canTransitionBuddyRelationship({ ...base, action: 'accept', actorUserId: 'recipient' }), true);
  assert.equal(canTransitionBuddyRelationship({ ...base, action: 'decline', actorUserId: 'recipient' }), true);
  assert.equal(canTransitionBuddyRelationship({ ...base, action: 'cancel', actorUserId: 'requester' }), true);
  assert.equal(canTransitionBuddyRelationship({ ...base, action: 'accept', actorUserId: 'requester' }), false);
  assert.equal(canTransitionBuddyRelationship({ ...base, action: 'cancel', actorUserId: 'recipient' }), false);
});

test('accepted relationship can be removed by either participant but no transition passes a block', () => {
  const base = {
    state: 'accepted',
    requesterUserId: 'requester',
    recipientUserId: 'recipient',
    action: 'remove',
  };

  assert.equal(canTransitionBuddyRelationship({ ...base, actorUserId: 'requester' }), true);
  assert.equal(canTransitionBuddyRelationship({ ...base, actorUserId: 'recipient' }), true);
  assert.equal(canTransitionBuddyRelationship({ ...base, actorUserId: 'other' }), false);
  assert.equal(canTransitionBuddyRelationship({ ...base, actorUserId: 'requester', blocked: true }), false);
});
