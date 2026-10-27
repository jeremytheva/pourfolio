import { createContext, useCallback, useEffect, useState } from 'react'
import { adminReviewService } from '../services/adminReviewService.js'

export const AdminReviewContext = createContext(null)

export const useAdminReviewAccess = (subjectId, inAdmin) => {
  const [state, setState] = useState({ subjectId: null, status: 'loading', canReview: false })
  const [revision, setRevision] = useState(0)
  const retry = useCallback(() => setRevision((value) => value + 1), [])
  useEffect(() => {
    let active = true
    setState({ subjectId, status: 'loading', canReview: false })
    if (subjectId) adminReviewService.getCapabilities(subjectId)
      .then((value) => { if (active) setState({ ...value, status: value.canReview ? 'ready' : 'denied' }) })
      .catch((error) => { if (active) setState({ subjectId, status: [401, 403].includes(error.status) ? 'denied' : 'unavailable', canReview: false }) })
    return () => { active = false }
  }, [subjectId, inAdmin, revision])
  return { ...(state.subjectId === subjectId ? state : { status: 'loading', canReview: false }), retry }
}
