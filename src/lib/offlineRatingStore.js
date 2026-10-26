// Device-only rating drafts. This store is never an authentication authority.
const DATABASE = 'pourfolio-offline-ratings-v1'
const VERSION = 1
const FORM_STORE = 'ratingForms'
const DRAFT_STORE = 'ratingDrafts'
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export const ratingDraftKey = (ownerId, productId) => {
  const owner = typeof ownerId === 'string' ? ownerId.trim() : ''
  const product = String(productId ?? '').trim()
  if (!owner || owner.length > 128 || !/^[1-9]\d*$/.test(product)) {
    throw new TypeError('A valid signed-in owner and product are required.')
  }
  return JSON.stringify([owner, product])
}

const openDatabase = () => new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined' || !indexedDB?.open) {
    reject(new Error('Offline storage is unavailable in this browser.'))
    return
  }
  const request = indexedDB.open(DATABASE, VERSION)
  request.onupgradeneeded = () => {
    const db = request.result
    if (!db.objectStoreNames.contains(FORM_STORE)) db.createObjectStore(FORM_STORE)
    if (!db.objectStoreNames.contains(DRAFT_STORE)) db.createObjectStore(DRAFT_STORE)
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(new Error('Offline storage could not be opened.'))
  request.onblocked = () => reject(new Error('Offline storage is blocked by another tab.'))
})

const transaction = async (storeName, mode, operation) => {
  const db = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      let result
      const tx = db.transaction(storeName, mode)
      const request = operation(tx.objectStore(storeName))
      request.onsuccess = () => { result = request.result }
      tx.oncomplete = () => resolve(result)
      tx.onerror = () => reject(new Error('Offline storage failed. Your changes were not confirmed as saved.'))
      tx.onabort = () => reject(new Error('Offline storage was interrupted. Your changes were not confirmed as saved.'))
    })
  } finally {
    db.close()
  }
}

const storeGet = (name, key) => transaction(name, 'readonly', (store) => store.get(key))
const storePut = (name, key, value) => transaction(name, 'readwrite', (store) => store.put(value, key))

export const projectRatingForm = (form, productId) => {
  if (!form || String(form.product?.id) !== String(productId) || !Array.isArray(form.attributes)) {
    throw new TypeError('The rating form cannot be cached.')
  }
  // Keep only the rating inputs; never persist gateway metadata, cookies or sessions.
  return {
    product: structuredClone(form.product),
    attributes: structuredClone(form.attributes),
    bonusAttributes: structuredClone(Array.isArray(form.bonusAttributes) ? form.bonusAttributes : []),
    bonusCategories: structuredClone(Array.isArray(form.bonusCategories) ? form.bonusCategories : [])
  }
}

export const cacheRatingForm = async (ownerId, productId, form) => {
  const key = ratingDraftKey(ownerId, productId)
  const projected = projectRatingForm(form, productId)
  await storePut(FORM_STORE, key, { savedAt: Date.now(), form: projected })
}

export const loadCachedRatingForm = async (ownerId, productId) => {
  const item = await storeGet(FORM_STORE, ratingDraftKey(ownerId, productId))
  if (!item || !Number.isFinite(item.savedAt) || Date.now() - item.savedAt > MAX_AGE_MS) return null
  return item.form || null
}

export const saveRatingDraft = async (ownerId, productId, draft) => {
  const key = ratingDraftKey(ownerId, productId)
  if (!draft || !Number.isSafeInteger(draft.submissionId) || draft.submissionId <= 0) {
    throw new TypeError('A stable rating submission identifier is required.')
  }
  const value = {
    savedAt: Date.now(),
    submissionId: draft.submissionId,
    scores: structuredClone(draft.scores || {}),
    bonusIds: structuredClone(draft.bonusIds || []),
    cellarId: String(draft.cellarId || ''),
    weights: structuredClone(draft.weights || {})
  }
  await storePut(DRAFT_STORE, key, value)
  return value
}

export const loadRatingDraft = async (ownerId, productId) => (
  (await storeGet(DRAFT_STORE, ratingDraftKey(ownerId, productId))) || null
)

export const discardRatingDraft = async (ownerId, productId, submissionId) => {
  const key = ratingDraftKey(ownerId, productId)
  const db = await openDatabase()
  try {
    // Read/check/delete in one transaction, so a newer draft in another tab
    // cannot be lost between a separate read and delete.
    return await new Promise((resolve, reject) => {
      let removed = false
      const tx = db.transaction(DRAFT_STORE, 'readwrite')
      const store = tx.objectStore(DRAFT_STORE)
      const request = store.get(key)
      request.onsuccess = () => {
        if (request.result?.submissionId === submissionId) {
          store.delete(key)
          removed = true
        }
      }
      tx.oncomplete = () => resolve(removed)
      tx.onerror = () => reject(new Error('The local draft could not be cleared.'))
      tx.onabort = () => reject(new Error('The local draft cleanup was interrupted.'))
    })
  } finally {
    db.close()
  }
}
