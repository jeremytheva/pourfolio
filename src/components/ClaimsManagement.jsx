import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import * as FiIcons from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon'
import { claimsService } from '../services/claimsService'

const { FiCheck, FiX, FiClock, FiUser, FiMail, FiMapPin, FiFileText, FiEye } = FiIcons

function ClaimsManagement({ user }) {
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedClaim, setSelectedClaim] = useState(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const loadClaims = useCallback(async () => {
    if (user?.type !== 'Admin User') return

    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await claimsService.getAllClaims()
      if (error) {
        throw error
      }
      setClaims(data || [])
    } catch (err) {
      console.error('Error loading claims:', err)
      setError(err.message)
      setClaims([])
    } finally {
      setLoading(false)
    }
  }, [user?.type])

  useEffect(() => {
    loadClaims()
  }, [loadClaims])

  const handleClaimAction = useCallback(async (claimId, status) => {
    if (!adminNotes.trim()) {
      setError('Please add admin notes before proceeding')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const { error } = await claimsService.updateClaimStatus(
        claimId,
        status,
        adminNotes,
        user.id
      )

      if (error) {
        throw error
      }

      const actionText = status === 'approved' ? 'approved' : 'rejected'
      alert(`Claim ${actionText} successfully!`)
      
      await loadClaims()
      setSelectedClaim(null)
      setAdminNotes('')
    } catch (err) {
      console.error(`Error ${status === 'approved' ? 'approving' : 'rejecting'} claim:`, err)
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }, [adminNotes, user?.id, loadClaims])

  const handleApprove = useCallback((claimId) => {
    handleClaimAction(claimId, 'approved')
  }, [handleClaimAction])

  const handleReject = useCallback((claimId) => {
    handleClaimAction(claimId, 'rejected')
  }, [handleClaimAction])

  const getStatusColor = useCallback((status) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      under_review: 'bg-blue-100 text-blue-800'
    }
    return statusColors[status] || 'bg-gray-100 text-gray-800'
  }, [])

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  const claimStats = useMemo(() => {
    const pending = claims.filter(claim => claim.status === 'pending')
    const approved = claims.filter(c => c.status === 'approved')
    const rejected = claims.filter(c => c.status === 'rejected')
    const reviewed = claims.filter(claim => claim.status !== 'pending')

    return { pending, approved, rejected, reviewed }
  }, [claims])

  if (user?.type !== 'Admin User') {
    return (
      <div className="text-center py-12">
        <SafeIcon icon={FiUser} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-500">Access Denied</h3>
        <p className="text-gray-400">This section is for administrators only</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading claims...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Producer Claims Management</h2>
        <p className="text-gray-600">Review and approve brewery ownership claims</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{claimStats.pending.length}</div>
          <div className="text-sm text-yellow-800">Pending Claims</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{claimStats.approved.length}</div>
          <div className="text-sm text-green-800">Approved</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{claimStats.rejected.length}</div>
          <div className="text-sm text-red-800">Rejected</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{claims.length}</div>
          <div className="text-sm text-blue-800">Total Claims</div>
        </div>
      </div>

      {/* Pending Claims */}
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          Pending Claims ({claimStats.pending.length})
        </h3>

        {claimStats.pending.length > 0 ? (
          <div className="space-y-4">
            {claimStats.pending.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                onReview={(claim) => {
                  setSelectedClaim(claim)
                  setAdminNotes('')
                }}
                getStatusColor={getStatusColor}
                formatDate={formatDate}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <SafeIcon icon={FiClock} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">No Pending Claims</h3>
            <p className="text-gray-400">All claims have been reviewed</p>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedClaim && (
        <ReviewModal
          claim={selectedClaim}
          adminNotes={adminNotes}
          setAdminNotes={setAdminNotes}
          onClose={() => setSelectedClaim(null)}
          onApprove={() => handleApprove(selectedClaim.id)}
          onReject={() => handleReject(selectedClaim.id)}
          isProcessing={isProcessing}
          formatDate={formatDate}
        />
      )}

      {/* Recent Reviews */}
      {claimStats.reviewed.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Recent Reviews ({claimStats.reviewed.length})
          </h3>
          <div className="space-y-3">
            {claimStats.reviewed.slice(0, 10).map((claim) => (
              <div key={claim.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-3">
                      <h5 className="font-medium text-gray-800">{claim.producer_name}</h5>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(claim.status)}`}>
                        {claim.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Claimed by: {claim.profiles?.name || 'Unknown User'} ({claim.contact_email})
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      Reviewed: {claim.reviewed_at ? formatDate(claim.reviewed_at) : 'N/A'}
                    </p>
                  </div>
                </div>
                {claim.admin_notes && (
                  <div className="mt-3 p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-700">
                      <strong>Admin Notes:</strong> {claim.admin_notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Optimized sub-components
const ClaimCard = React.memo(({ claim, onReview, getStatusColor, formatDate }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center space-x-3 mb-3">
          <h4 className="text-lg font-semibold text-gray-800">
            {claim.producer_name}
          </h4>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(claim.status)}`}>
            {claim.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <SafeIcon icon={FiUser} className="w-4 h-4" />
              <span>Claimed by: {claim.profiles?.name || 'Unknown User'}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <SafeIcon icon={FiMail} className="w-4 h-4" />
              <span>{claim.contact_email}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <SafeIcon icon={FiClock} className="w-4 h-4" />
              <span>Submitted: {formatDate(claim.created_at)}</span>
            </div>
          </div>

          <div className="space-y-2">
            {claim.business_license && (
              <div className="text-sm text-gray-600">
                <strong>Business License:</strong> {claim.business_license}
              </div>
            )}
            {claim.tax_id && (
              <div className="text-sm text-gray-600">
                <strong>Tax ID:</strong> {claim.tax_id}
              </div>
            )}
            {claim.contact_phone && (
              <div className="text-sm text-gray-600">
                <strong>Phone:</strong> {claim.contact_phone}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => onReview(claim)}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
        >
          <SafeIcon icon={FiEye} className="w-4 h-4" />
          <span>Review</span>
        </button>
      </div>
    </div>
  </div>
))

const ReviewModal = React.memo(({ 
  claim, 
  adminNotes, 
  setAdminNotes, 
  onClose, 
  onApprove, 
  onReject, 
  isProcessing, 
  formatDate 
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800">Review Claim</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <SafeIcon icon={FiX} className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Claim Details */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-3">{claim.producer_name}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">
                <strong>Claimant:</strong> {claim.profiles?.name || 'Unknown User'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Email:</strong> {claim.contact_email}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Submitted:</strong> {formatDate(claim.created_at)}
              </p>
            </div>
            <div>
              {claim.business_license && (
                <p className="text-sm text-gray-600">
                  <strong>Business License:</strong> {claim.business_license}
                </p>
              )}
              {claim.tax_id && (
                <p className="text-sm text-gray-600">
                  <strong>Tax ID:</strong> {claim.tax_id}
                </p>
              )}
              {claim.contact_phone && (
                <p className="text-sm text-gray-600">
                  <strong>Phone:</strong> {claim.contact_phone}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Admin Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Admin Notes *
          </label>
          <textarea
            rows={4}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add notes about your decision..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            required
          />
          {!adminNotes.trim() && (
            <p className="text-sm text-red-600 mt-1">Admin notes are required</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <ActionButton
            onClick={onApprove}
            disabled={!adminNotes.trim() || isProcessing}
            isProcessing={isProcessing}
            icon={FiCheck}
            label="Approve Claim"
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
          />
          <ActionButton
            onClick={onReject}
            disabled={!adminNotes.trim() || isProcessing}
            isProcessing={isProcessing}
            icon={FiX}
            label="Reject Claim"
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
          />
        </div>
      </div>
    </motion.div>
  </div>
))

const ActionButton = React.memo(({ 
  onClick, 
  disabled, 
  isProcessing, 
  icon, 
  label, 
  className 
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`${className} text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2`}
  >
    {isProcessing ? (
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
    ) : (
      <SafeIcon icon={icon} className="w-5 h-5" />
    )}
    <span>{isProcessing ? 'Processing...' : label}</span>
  </button>
))

export default ClaimsManagement