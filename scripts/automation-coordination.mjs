import { randomUUID } from 'node:crypto'

export const CLAIM_BRANCH = 'automation/coordination'
export const CLAIM_PATH = '.automation/claims.json'
export const DEFAULT_LEASE_MS = 30 * 60 * 1000
const MAX_LEASE_MS = 45 * 60 * 1000
const MAX_ATTEMPTS = 4
const TRANSIENT = new Set([408, 429, 500, 502, 503, 504])

export class ClaimConflict extends Error { constructor(message) { super(message); this.name = 'ClaimConflict' } }
export class RepoWriteBlocked extends Error { constructor(message) { super(message); this.name = 'RepoWriteBlocked' } }
export class StaleState extends Error { constructor(message) { super(message); this.name = 'StaleState' } }

export function validateClaim(input) {
  if (!input || typeof input !== 'object') throw new TypeError('Claim required')
  const { owner, workstream, issue = null, pr = null, surfaces = [] } = input
  if (![owner, workstream].every(x => typeof x === 'string' && /^[a-zA-Z0-9:_./-]{2,120}$/.test(x))) {
    throw new TypeError('Stable owner and workstream required')
  }
  if (issue !== null && (!Number.isSafeInteger(issue) || issue < 1)) throw new TypeError('Invalid issue')
  if (pr !== null && (!Number.isSafeInteger(pr) || pr < 1)) throw new TypeError('Invalid PR')
  if (!Array.isArray(surfaces) || !surfaces.length || surfaces.some(s => typeof s !== 'string' || !/^[a-zA-Z0-9:_./-]{2,120}$/.test(s))) {
    throw new TypeError('At least one named, stable integration surface required')
  }
  return { owner, workstream, issue, pr, surfaces: [...new Set(surfaces)].sort() }
}

export function activeClaims(document, now = Date.now()) {
  if (document?.version !== 1 || !document.claims || typeof document.claims !== 'object' || Array.isArray(document.claims)) {
    throw new Error('Invalid coordination ledger: fail closed')
  }
  return Object.fromEntries(Object.entries(document.claims).filter(([, c]) =>
    c && typeof c.owner === 'string' && typeof c.expiresAt === 'string' && Date.parse(c.expiresAt) > now))
}

export function overlaps(a, b) {
  if (a.issue !== null && a.issue === b.issue) return true
  if (a.pr !== null && a.pr === b.pr) return true
  return a.surfaces.some(surface => b.surfaces.includes(surface))
}

export function claimNext(document, raw, now = Date.now(), leaseMs = DEFAULT_LEASE_MS) {
  if (!Number.isFinite(leaseMs) || leaseMs <= 0 || leaseMs > MAX_LEASE_MS) throw new TypeError('Lease must be <=45 min')
  const incoming = validateClaim(raw)
  const claims = activeClaims(document, now)
  const prior = claims[incoming.workstream]
  if (prior && prior.owner !== incoming.owner) throw new ClaimConflict(`${incoming.workstream} is owned by another execution`)
  for (const [name, claim] of Object.entries(claims)) {
    if (name !== incoming.workstream && overlaps(incoming, claim)) {
      throw new ClaimConflict(`Conflicting workstream ${name}; issue, PR or surface already claimed`)
    }
  }
  claims[incoming.workstream] = { ...incoming, acquiredAt: prior?.acquiredAt ?? new Date(now).toISOString(), expiresAt: new Date(now + leaseMs).toISOString() }
  return { version: 1, claims }
}

export function releaseNext(document, workstream, owner, now = Date.now()) {
  const claims = activeClaims(document, now)
  if (claims[workstream] && claims[workstream].owner !== owner) throw new ClaimConflict('Only claimant can release a live lease')
  delete claims[workstream]
  return { version: 1, claims }
}

// Re-read on SHA conflict. Always read back after an ambiguous remote mutation.
export async function mutateLedger(store, operation, { maxAttempts = MAX_ATTEMPTS } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const state = await store.read()
    const desired = operation(state.document)
    if (JSON.stringify(desired) === JSON.stringify(state.document)) return { document: desired, changed: false }
    try {
      await store.write(desired, state.sha)
      const verified = await store.read()
      if (JSON.stringify(verified.document) === JSON.stringify(desired)) return { document: desired, changed: true }
      if (attempt === maxAttempts - 1) throw new StaleState('Result was superseded; inspect current claim')
    } catch (error) {
      if (error instanceof ClaimConflict || error instanceof RepoWriteBlocked || error instanceof StaleState) throw error
      if (error.code !== 'STALE_SHA' && error.code !== 'UNCERTAIN_WRITE') throw error
      const latest = await store.read()
      if (JSON.stringify(latest.document) === JSON.stringify(desired)) return { document: desired, changed: true }
      if (attempt === maxAttempts - 1) throw new StaleState('Conflicting updates continued; no claim assumed')
    }
  }
  throw new StaleState('Bounded claim attempts exhausted')
}

// GitHub API adapter. Secrets are process-only and never logged.
export function githubClaimStore({ repository, token, fetchImpl = fetch, pause = ms => new Promise(r => setTimeout(r, ms)), random = Math.random }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new TypeError('Invalid repository')
  if (!token) throw new RepoWriteBlocked('GITHUB_TOKEN not available; use connected GitHub CAS actions or proceed read-only')
  const endpoint = `https://api.github.com/repos/${repository}/contents/${CLAIM_PATH}`
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
  const request = async (method, url, body) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      let response
      try { response = await fetchImpl(url, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) }) }
      catch (error) { if (method !== 'GET') { const e = new Error('Ambiguous GitHub write'); e.code = 'UNCERTAIN_WRITE'; throw e }; if (attempt === 2) throw error; await pause(100 * 2 ** attempt + Math.floor(random() * 50)); continue }
      if (response.ok) return response.json()
      if ([401, 403].includes(response.status)) throw new RepoWriteBlocked(`GitHub access denied (HTTP ${response.status})`)
      if ([409, 412, 422].includes(response.status)) { const e = new Error('GitHub revision conflict'); e.code = 'STALE_SHA'; throw e }
      if (TRANSIENT.has(response.status) && attempt < 2 && method === 'GET') { await pause(100 * 2 ** attempt + Math.floor(random() * 50)); continue }
      if (TRANSIENT.has(response.status) && method !== 'GET') { const e = new Error('Ambiguous transient GitHub write'); e.code = 'UNCERTAIN_WRITE'; throw e }
      throw new Error(`GitHub API HTTP ${response.status}`)
    }
  }
  return {
    async read() {
      const body = await request('GET', `${endpoint}?ref=${encodeURIComponent(CLAIM_BRANCH)}`)
      const document = JSON.parse(Buffer.from(body.content.replace(/\s/g, ''), 'base64').toString('utf8'))
      activeClaims(document)
      return { document, sha: body.sha }
    },
    async write(document, sha) {
      await request('PUT', endpoint, { message: 'chore(automation): update bounded execution claims', content: Buffer.from(`${JSON.stringify(document, null, 2)}\n`).toString('base64'), sha, branch: CLAIM_BRANCH })
    }
  }
}

export async function runCli({ argv = process.argv.slice(2), env = process.env } = {}) {
  const [action, workstream, owner = randomUUID(), ...rest] = argv
  if (!['acquire', 'renew', 'release', 'status'].includes(action)) throw new TypeError('Use status | acquire | renew | release')
  const store = githubClaimStore({ repository: env.GITHUB_REPOSITORY || 'jeremytheva/pourfolio', token: env.GITHUB_TOKEN })
  if (action === 'status') return { claims: activeClaims((await store.read()).document) }
  if (!workstream) throw new TypeError('Workstream required')
  if (action === 'release') return mutateLedger(store, document => releaseNext(document, workstream, owner))
  const args = Object.fromEntries(rest.map(arg => { const i = arg.indexOf('='); if (i === -1) throw new TypeError('Expected key=value'); return [arg.slice(0, i), arg.slice(i + 1)] }))
  return mutateLedger(store, document => claimNext(document, {
    owner, workstream, issue: args.issue ? Number(args.issue) : null, pr: args.pr ? Number(args.pr) : null,
    surfaces: args.surfaces?.split(',') ?? []
  }))
}

if (process.argv[1]?.endsWith('/automation-coordination.mjs')) {
  runCli().then(result => { console.log(JSON.stringify(result)) }).catch(error => {
    console.error(`${error.name}: ${error.message}`)
    process.exitCode = 1
  })
}
