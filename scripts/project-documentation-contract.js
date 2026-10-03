// Offline checks compare source contracts and retained evidence, not live GitHub.
export const auditDocumentationContracts = ({ contract, texts, issueEvidence }) => {
  const findings = []
  const add = (code, detail) => findings.push({ code, ...detail })
  const environment = contract.provider?.canonical_environment_variables ?? []
  for (const file of ['ARCHITECTURE.md', 'AGENTS.md', '.env.example']) {
    for (const variable of environment) {
      if (!texts[file]?.includes(variable)) add('PROVIDER_ENVIRONMENT_DOCUMENTATION_DRIFT', { path: file, variable })
    }
  }

  const sourceRoutes = [...texts['src/App.jsx'].matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1])
  const publicRoutes = [...texts['src/data/publicDocuments.js'].matchAll(/\['(\/[^']+)',\s*'/g)].map((match) => match[1])
  const map = texts['SYSTEM_MAP.md'].split('<!-- current-browser-routes:start -->')[1]?.split('<!-- current-browser-routes:end -->')[0] ?? ''
  const mappedRoutes = [...map.matchAll(/^- `([^`]+)`$/gm)].map((match) => match[1])
  const actual = new Set([...sourceRoutes, ...publicRoutes])
  const documented = new Set(mappedRoutes)
  for (const route of actual) {
    if (!documented.has(route)) add('BROWSER_ROUTE_UNDOCUMENTED', { route })
  }
  for (const route of documented) {
    if (!actual.has(route)) add('BROWSER_ROUTE_STALE', { route })
  }

  const mapping = contract.collections?.bonus_attribute_rating_mapping
  const fields = mapping?.provider_fields?.filter((field) => !['id', 'user_id', 'rating_id'].includes(field)) ?? []
  if (fields.length !== 1) add('RATING_BONUS_RELATIONSHIP_CONTRACT_INVALID', {})
  for (const field of fields) {
    for (const file of ['api/rating-data-proxy.js', 'DATA_MODEL.md', 'docs/DATA_MODEL.md', 'docs/nocodebackend/schema-mapping.md', 'docs/nocodebackend/launch-schema-contract.md']) {
      if (!texts[file]?.includes(field)) add('RATING_BONUS_FIELD_CONTRACT_DRIFT', { path: file, field })
    }
  }
  // The category mapping legitimately uses the singular spelling elsewhere.
  if (/\bbonus_attribute_id\b/.test(texts['api/rating-data-proxy.js'])) {
    add('RATING_BONUS_FIELD_UNSUPPORTED', { path: 'api/rating-data-proxy.js' })
  }

  const blockerSection = texts['STATUS.md'].match(/^blockers:\s*\n([\s\S]*?)^requires_owner_decision:/m)?.[1] ?? ''
  const blockers = [...blockerSection.matchAll(/^\s+issue:\s*(\d+)$/gm)].map((match) => Number(match[1]))
  findings.push(...auditBlockerIssueStates(blockers, issueEvidence.issue_states ?? {}))
  return findings
}

export const auditBlockerIssueStates = (blockers, states) => blockers.flatMap((issue) => {
  if (states[issue] === 'closed') return [{ code: 'CURRENT_BLOCKER_ISSUE_CLOSED', issue }]
  if (states[issue] !== 'open') return [{ code: 'CURRENT_BLOCKER_ISSUE_UNVERIFIED', issue }]
  return []
})
