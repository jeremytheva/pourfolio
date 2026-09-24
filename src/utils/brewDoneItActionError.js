export function getBrewDoneItActionError(error) {
  const message = typeof error?.message === 'string' ? error.message : ''
  const status = Number(error?.status)
  const expired = /expired/i.test(message)
  const stale = error?.code === 'VERSION_CONFLICT'
  const safeBusinessError = status >= 400 && status < 500 && message

  if (expired) {
    return {
      message: 'This challenge has expired. Create or join another challenge.',
      retryable: false
    }
  }

  if (stale) {
    return {
      message: 'The challenge changed before your action was accepted. Refresh before trying again.',
      retryable: false
    }
  }

  if (status === 0) {
    return {
      message: 'Brew Done It could not be reached. Check your connection and retry.',
      retryable: true
    }
  }

  if (safeBusinessError) {
    return {
      message,
      retryable: false
    }
  }

  return {
    message: 'That action could not be completed. Refresh the series and try again.',
    retryable: status >= 500 || !Number.isFinite(status)
  }
}
