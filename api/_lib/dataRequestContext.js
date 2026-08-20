import { AsyncLocalStorage } from 'node:async_hooks'

const storage = new AsyncLocalStorage()

export const withDataRequestContext = (request, callback) => storage.run({
  cookie: request?.headers?.cookie || '',
  origin: request?.headers?.origin || null
}, callback)

export const getDataRequestContext = () => storage.getStore() || { cookie: '', origin: null }
