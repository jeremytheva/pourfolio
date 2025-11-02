import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { beverageTypes } from '../utils/beverageTypes';
import { extractItems, getBeverages } from '../lib/nocode';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&h=600&fit=crop';

const normaliseType = (rawType) => {
  if (!rawType) {
    return 'beer';
  }
  const candidate = String(rawType).toLowerCase();
  if (beverageTypes[candidate]) {
    return candidate;
  }
  // attempt to map plural forms like "beers" -> "beer"
  const singular = candidate.endsWith('s') ? candidate.slice(0, -1) : candidate;
  if (beverageTypes[singular]) {
    return singular;
  }
  return 'beer';
};

const normaliseRating = (value) => {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return Math.max(0, Math.min(5, Math.round(parsed * 100) / 100));
};

const normaliseBeverage = (raw) => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const type = normaliseType(
    raw.type ||
      raw.beverage_type ||
      raw.category ||
      raw.primary_category
  );

  const category =
    raw.category_label ||
    raw.style ||
    raw.style_name ||
    raw.subcategory ||
    raw.category ||
    'Uncategorised';

  const producer =
    raw.producer_name ||
    raw.producer ||
    raw.brewery ||
    raw.brewery_name ||
    raw.brand ||
    'Unknown Producer';

  const image =
    raw.image_url ||
    raw.photo_url ||
    raw.thumbnail ||
    raw.label_image ||
    PLACEHOLDER_IMAGE;

  const rating = normaliseRating(
    raw.average_rating ||
      raw.rating ||
      raw.score ||
      raw.final_rating
  );

  const name = raw.name || raw.beverage_name || raw.display_name || 'Untitled Beverage';

  return {
    id: raw.id || raw.beverage_id || raw.uuid || raw.slug || `${producer}-${name}`,
    name,
    producer,
    type,
    category,
    rating,
    image
  };
};

export function useBeverages() {
  const query = useQuery({
    queryKey: ['beverages'],
    queryFn: getBeverages,
    staleTime: 60_000
  });

  const beverages = useMemo(() => {
    const rawItems = extractItems(query.data);
    return rawItems
      .map(normaliseBeverage)
      .filter(Boolean);
  }, [query.data]);

  return {
    ...query,
    beverages
  };
}
