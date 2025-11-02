const API_BASE = 'https://api.nocodebackend.com';

const getEnv = (key) => {
  if (typeof import.meta === 'undefined' || !import.meta.env) {
    return undefined;
  }
  return import.meta.env[key];
};

const ensureLeadingSlash = (path) => {
  if (!path) {
    return '/';
  }
  return path.startsWith('/') ? path : `/${path}`;
};

const isJsonLikeBody = (value) => {
  if (!value) {
    return false;
  }
  if (typeof value !== 'object') {
    return false;
  }
  return !(value instanceof FormData) && !(value instanceof Blob) && !(value instanceof ArrayBuffer);
};

export const extractItems = (response) => {
  if (!response) {
    return [];
  }
  if (Array.isArray(response)) {
    return response;
  }
  if (Array.isArray(response.items)) {
    return response.items;
  }
  if (Array.isArray(response.data)) {
    return response.data;
  }
  if (Array.isArray(response.records)) {
    return response.records;
  }
  return [];
};

export async function nocodeFetch(path, options = {}) {
  const {
    method = 'GET',
    headers = {},
    searchParams,
    body,
    ...rest
  } = options;

  const normalizedPath = ensureLeadingSlash(path);
  const url = new URL(normalizedPath, API_BASE);

  if (searchParams && typeof searchParams === 'object') {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      url.searchParams.set(key, value);
    });
  }

  const instanceId = getEnv('VITE_NOCODE_INSTANCE');
  if (instanceId && !url.searchParams.has('Instance')) {
    url.searchParams.set('Instance', instanceId);
  }

  const requestHeaders = {
    Accept: 'application/json',
    ...headers
  };

  const secret = getEnv('VITE_NOCODE_SECRET');
  if (secret) {
    requestHeaders['x-api-key'] = secret;
  }

  let resolvedBody = body;
  if (isJsonLikeBody(body)) {
    requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json';
    resolvedBody = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), {
    method,
    headers: requestHeaders,
    body: resolvedBody,
    ...rest
  });

  const isJsonResponse = response.headers.get('content-type')?.includes('application/json');

  if (!response.ok) {
    const errorMessage = isJsonResponse ? await response.text() : await response.text();
    throw new Error(`NoCodeBackend request failed (${response.status}): ${errorMessage}`);
  }

  if (response.status === 204) {
    return null;
  }

  if (isJsonResponse) {
    return response.json();
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    return text;
  }
}

export const getBeverages = () =>
  nocodeFetch('/read/beverages');

export const getBonusAttributes = () =>
  nocodeFetch('/read/bonus_attributes');

export const createRating = (data) =>
  nocodeFetch('/create/ratings', {
    method: 'POST',
    body: data
  });
