const TASTING_VISIBILITIES = Object.freeze([
  'private',
  'drinking_buddies',
  'public',
]);

const RELATIONSHIP_STATES = Object.freeze([
  'pending',
  'accepted',
  'declined',
  'cancelled',
  'removed',
]);

const visibilitySet = new Set(TASTING_VISIBILITIES);
const relationshipStateSet = new Set(RELATIONSHIP_STATES);

export function normalizeTastingVisibility(value) {
  return typeof value === 'string' && visibilitySet.has(value)
    ? value
    : 'private';
}

export function normalizeRelationshipState(value) {
  return typeof value === 'string' && relationshipStateSet.has(value)
    ? value
    : null;
}

// Account defaults are future-facing only. Missing/legacy/invalid defaults fail
// closed and never retroactively change an existing tasting event.
export function resolveVisibilityForNewTasting({
  eventVisibility,
  accountDefaultVisibility,
} = {}) {
  if (typeof eventVisibility === 'string' && visibilitySet.has(eventVisibility)) {
    return eventVisibility;
  }

  return normalizeTastingVisibility(accountDefaultVisibility);
}

export function canOwnerSetTastingVisibility({
  actorUserId,
  ownerUserId,
  requestedVisibility,
  publicSurfaceEnabled = false,
} = {}) {
  const actor = normalizeUserId(actorUserId);
  const owner = normalizeUserId(ownerUserId);

  if (!actor || !owner || actor !== owner) return false;
  if (typeof requestedVisibility !== 'string' || !visibilitySet.has(requestedVisibility)) return false;
  if (requestedVisibility === 'public') return publicSurfaceEnabled === true;
  return true;
}

export function canonicalBuddyPair(firstUserId, secondUserId) {
  const first = normalizeUserId(firstUserId);
  const second = normalizeUserId(secondUserId);

  if (!first || !second || first === second) return null;

  return first.localeCompare(second) <= 0
    ? { userLowId: first, userHighId: second }
    : { userLowId: second, userHighId: first };
}

export function canCreateBuddyRequest({
  actorUserId,
  recipientUserId,
  existingRelationshipState = null,
  actorBlockedRecipient = false,
  recipientBlockedActor = false,
} = {}) {
  const actor = normalizeUserId(actorUserId);
  const recipient = normalizeUserId(recipientUserId);
  if (!actor || !recipient || actor === recipient) return false;
  if (actorBlockedRecipient || recipientBlockedActor) return false;

  const existing = normalizeRelationshipState(existingRelationshipState);
  return existing === null || existing === 'declined' || existing === 'cancelled' || existing === 'removed';
}

export function canManageBuddyBlock({ actorUserId, targetUserId } = {}) {
  return canonicalBuddyPair(actorUserId, targetUserId) !== null;
}

export function effectiveBuddyRelationshipState({
  relationshipState = null,
  actorBlockedRecipient = false,
  recipientBlockedActor = false,
} = {}) {
  if (actorBlockedRecipient || recipientBlockedActor) return null;
  return normalizeRelationshipState(relationshipState);
}

export function canReadSharedTasting({
  viewerUserId,
  ownerUserId,
  visibility,
  relationshipState = null,
  viewerBlockedOwner = false,
  ownerBlockedViewer = false,
  publicSurfaceEnabled = false,
} = {}) {
  const viewer = normalizeUserId(viewerUserId);
  const owner = normalizeUserId(ownerUserId);

  if (!viewer || !owner) return false;
  if (viewer === owner) return true;
  if (viewerBlockedOwner || ownerBlockedViewer) return false;

  const effectiveVisibility = normalizeTastingVisibility(visibility);
  if (effectiveVisibility === 'drinking_buddies') {
    return normalizeRelationshipState(relationshipState) === 'accepted';
  }
  if (effectiveVisibility === 'public') return publicSurfaceEnabled === true;
  return false;
}

export function canTransitionBuddyRelationship({
  state,
  action,
  actorUserId,
  requesterUserId,
  recipientUserId,
  blocked = false,
} = {}) {
  const currentState = normalizeRelationshipState(state);
  const actor = normalizeUserId(actorUserId);
  const requester = normalizeUserId(requesterUserId);
  const recipient = normalizeUserId(recipientUserId);

  if (!currentState || !actor || !requester || !recipient || requester === recipient) return false;
  if (blocked) return false;

  if (currentState === 'pending') {
    if (action === 'accept' || action === 'decline') return actor === recipient;
    if (action === 'cancel') return actor === requester;
  }

  if (currentState === 'accepted' && action === 'remove') {
    return actor === requester || actor === recipient;
  }

  return false;
}

function normalizeUserId(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export { TASTING_VISIBILITIES, RELATIONSHIP_STATES };
