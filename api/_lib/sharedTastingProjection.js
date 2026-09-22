import { canReadSharedTasting } from './tastingSharingPolicy.js';

const ALLOWED_EVENT_TYPES = new Set(['full_tasting', 'quick_rate']);

const cleanText = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const cleanScore = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 5 ? score : null;
};

// This is deliberately an allow-list projection. Provider rows, cellar records,
// prices, notes, location/context and internal identifiers must never be spread
// into a shared response.
export function projectSharedTasting({
  viewerUserId,
  relationshipState = null,
  viewerBlockedOwner = false,
  ownerBlockedViewer = false,
  publicSurfaceEnabled = false,
  event,
  profile,
  product,
  producer,
} = {}) {
  if (!event || !profile || !product || !producer) return null;

  if (!canReadSharedTasting({
    viewerUserId,
    ownerUserId: event.user_id,
    visibility: event.visibility,
    relationshipState,
    viewerBlockedOwner,
    ownerBlockedViewer,
    publicSurfaceEnabled,
  })) return null;

  // ADR 0007 permits only explicitly supported canonical tasting event types.
  // Unknown, legacy, migration-only or future event types must not be coerced into
  // a shareable full tasting because that can bypass later event-specific policy.
  if (!ALLOWED_EVENT_TYPES.has(event.event_type)) return null;

  const eventType = event.event_type;
  const displayScore = cleanScore(eventType === 'quick_rate' ? event.quick_rate_score : event.total_weighted);
  const eventTimestamp = cleanText(event.date_rated);
  const profilePublicId = cleanText(profile.public_id);
  const profileDisplayName = cleanText(profile.display_name);
  const profileAvatarUrl = cleanText(profile.avatar_url);
  const productPublicId = cleanText(product.public_id);
  const productName = cleanText(product.product_name);
  const producerPublicId = cleanText(producer.public_id);
  const producerName = cleanText(producer.producer_name);

  if (!eventTimestamp || displayScore === null || !profilePublicId || !profileDisplayName
    || !productPublicId || !productName || !producerPublicId || !producerName) return null;

  return {
    profile: {
      publicId: profilePublicId,
      displayName: profileDisplayName,
      ...(profileAvatarUrl ? { avatarUrl: profileAvatarUrl } : {}),
    },
    product: { publicId: productPublicId, name: productName },
    producer: { publicId: producerPublicId, name: producerName },
    eventType,
    eventTimestamp,
    displayScore,
  };
}

export { ALLOWED_EVENT_TYPES };
