import { projectSharedTasting } from './sharedTastingProjection.js';

const normalizeLimit = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return 20;
  return Math.min(parsed, 50);
};

const validTimestamp = (value) => {
  if (typeof value !== 'string' || !value.trim()) return false;
  return Number.isFinite(Date.parse(value));
};

// Provider-independent feed composition only. This module does not fetch provider
// data or expose a route. Callers must supply current relationship/block state for
// every canonical event so authorization is re-evaluated on every projection.
export function projectDrinkingBuddyFeed({
  viewerUserId,
  feedEnabled = false,
  candidates = [],
  limit = 20,
} = {}) {
  if (feedEnabled !== true || typeof viewerUserId !== 'string' || !viewerUserId.trim()) return [];
  if (!Array.isArray(candidates)) return [];

  const projected = [];
  for (const candidate of candidates) {
    if (!candidate || candidate.feedOptIn !== true) continue;

    const item = projectSharedTasting({
      viewerUserId,
      relationshipState: candidate.relationshipState,
      viewerBlockedOwner: candidate.viewerBlockedOwner === true,
      ownerBlockedViewer: candidate.ownerBlockedViewer === true,
      publicSurfaceEnabled: false,
      event: candidate.event,
      profile: candidate.profile,
      product: candidate.product,
      producer: candidate.producer,
    });

    if (!item || !validTimestamp(item.eventTimestamp)) continue;
    projected.push(item);
  }

  projected.sort((left, right) => Date.parse(right.eventTimestamp) - Date.parse(left.eventTimestamp));
  return projected.slice(0, normalizeLimit(limit));
}
