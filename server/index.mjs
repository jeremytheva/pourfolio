import { createPourfolioServer } from './runtime.mjs'

const port = Number.parseInt(process.env.PORT || '3000', 10)
const host = process.env.HOST || '0.0.0.0'

if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port.')
}

const server = createPourfolioServer()
server.listen(port, host)
