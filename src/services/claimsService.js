import { nocodeBackend } from '../lib/nocodeBackend'
import { attachProfilesToRecords } from './relationshipHelpers'

const CLAIMS = 'producer_claims_pf2025'

class ClaimsService {
  constructor() {
    this.cache = new Map()
    this.cacheTimeout = 5 * 60 * 1000 // 5 minutes
  }

  // NoCodeBackend cannot represent profile joins in one collection call;
  // profile details are hydrated with follow-up collection reads.
  async getClaimsWithProfiles(filters = {}) {
    const { data, error } = await nocodeBackend.list(CLAIMS, {
      filters,
      orderBy: 'created_at',
      ascending: false
    })
    if (error) return { data, error }

    const claims = await attachProfilesToRecords(data || [], ['name', 'email'])

    return { data: claims, error: null }
  }

  async submitProducerClaim(claimData) {
    try {
      this.validateClaimData(claimData)

      const { data, error } = await nocodeBackend.create(CLAIMS, {
        user_id: claimData.user_id,
        producer_id: claimData.producer_id || null,
        producer_name: claimData.producer_name,
        business_license: claimData.business_license || null,
        tax_id: claimData.tax_id || null,
        contact_email: claimData.contact_email,
        contact_phone: claimData.contact_phone || null,
        status: 'pending'
      })

      this.invalidateCache('all-claims')
      this.invalidateCache(`user-claims-${claimData.user_id}`)

      return { data, error }
    } catch (err) {
      console.error('Error in submitProducerClaim:', err)
      return { data: null, error: err }
    }
  }

  async getUserClaims(userId) {
    if (!userId) return { data: [], error: { message: 'User ID is required' } }

    const cacheKey = `user-claims-${userId}`
    const cached = this.getFromCache(cacheKey)
    if (cached) return { data: cached, error: null }

    try {
      const { data, error } = await nocodeBackend.list(CLAIMS, {
        filters: { user_id: userId },
        orderBy: 'created_at',
        ascending: false
      })

      if (!error && data) this.setCache(cacheKey, data)
      return { data: data || [], error }
    } catch (err) {
      console.error('Error in getUserClaims:', err)
      return { data: [], error: err }
    }
  }

  async getAllClaims() {
    const cacheKey = 'all-claims'
    const cached = this.getFromCache(cacheKey)
    if (cached) return { data: cached, error: null }

    try {
      const { data, error } = await this.getClaimsWithProfiles()
      if (!error && data) this.setCache(cacheKey, data)
      return { data: data || [], error }
    } catch (err) {
      console.error('Error in getAllClaims:', err)
      return { data: [], error: err }
    }
  }

  async getPendingClaims() {
    const cacheKey = 'pending-claims'
    const cached = this.getFromCache(cacheKey)
    if (cached) return { data: cached, error: null }

    try {
      const { data, error } = await this.getClaimsWithProfiles({ status: 'pending' })
      if (!error && data) this.setCache(cacheKey, data)
      return { data: data || [], error }
    } catch (err) {
      console.error('Error in getPendingClaims:', err)
      return { data: [], error: err }
    }
  }

  async updateClaimStatus(claimId, status, adminNotes = '', reviewedBy) {
    try {
      this.validateUpdateData({ claimId, status, adminNotes, reviewedBy })

      const { data, error } = await nocodeBackend.update(CLAIMS, claimId, {
        status,
        admin_notes: adminNotes,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString()
      })

      this.invalidateAllCaches()
      return { data, error }
    } catch (err) {
      console.error('Error in updateClaimStatus:', err)
      return { data: null, error: err }
    }
  }

  async deleteClaim(claimId) {
    if (!claimId) return { data: null, error: { message: 'Claim ID is required' } }

    try {
      const { data, error } = await nocodeBackend.remove(CLAIMS, claimId)
      this.invalidateAllCaches()
      return { data, error }
    } catch (err) {
      console.error('Error in deleteClaim:', err)
      return { data: null, error: err }
    }
  }

  validateClaimData(claimData) {
    const requiredFields = ['producer_name', 'contact_email', 'user_id']
    for (const field of requiredFields) {
      if (!claimData[field]) throw new Error(`Missing required field: ${field}`)
    }

    if (claimData.contact_email && !this.isValidEmail(claimData.contact_email)) {
      throw new Error('Invalid email format')
    }
  }

  validateUpdateData({ claimId, status, adminNotes, reviewedBy }) {
    if (!claimId) throw new Error('Claim ID is required')
    if (!adminNotes.trim()) throw new Error('Admin notes are required')
    if (!reviewedBy) throw new Error('Reviewer ID is required')
    if (!['pending', 'approved', 'rejected', 'under_review'].includes(status)) throw new Error('Invalid status')
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  getFromCache(key) {
    const cached = this.cache.get(key)
    if (!cached) return null

    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  invalidateCache(key) {
    this.cache.delete(key)
  }

  invalidateAllCaches() {
    this.cache.clear()
  }
}

export const claimsService = new ClaimsService()
