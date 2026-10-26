// One owner/product editor owns one serial writer. Local saves never upload.
export const createRatingDraftAutosave = ({ save, revision = null, onState = () => {}, delay = 350 }) => {
  let desired = null
  let version = 0
  let savedVersion = 0
  let saved = null
  let running = null
  let timer = null
  let closed = false
  let conflict = null

  const cancelTimer = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  const drain = () => {
    if (conflict) return Promise.reject(conflict)
    if (running) return running
    if (savedVersion === version) return Promise.resolve(saved)
    running = (async () => {
      while (savedVersion < version) {
        const currentVersion = version
        const snapshot = desired
        onState({ status: 'saving' })
        try {
          saved = await save(snapshot, revision)
        } catch (error) {
          if (error.code === 'OFFLINE_DRAFT_CONFLICT') conflict = error
          onState({ status: 'error', error })
          throw error
        }
        revision = saved.revision
        savedVersion = currentVersion
        // A completed old write cannot label newer edits as saved.
        onState({ status: savedVersion === version ? 'saved' : 'pending', saved })
      }
      return saved
    })().finally(() => { running = null })
    return running
  }

  const update = (snapshot) => {
    if (closed) return
    desired = structuredClone(snapshot)
    version += 1
    cancelTimer()
    if (conflict) {
      onState({ status: 'error', error: conflict })
      return
    }
    onState({ status: 'pending' })
    timer = setTimeout(() => {
      timer = null
      drain().catch(() => {}) // The visible state above owns error presentation.
    }, delay)
  }

  return {
    update,
    flush(snapshot) {
      if (snapshot !== undefined) update(snapshot)
      cancelTimer()
      return drain()
    },
    close() {
      // Flush the last captured edit on SPA navigation. Do not accept late edits
      // or let an unmounted owner/product editor save another session's state.
      closed = true
      cancelTimer()
      return drain()
    }
  }
}
