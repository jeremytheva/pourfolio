const normalise = (value) => String(value || '').trim().toLocaleLowerCase().replace(/\s+/gu, ' ')

const candidateForProposal = (product, proposal, excludeProductId) => {
  if (excludeProductId !== null && excludeProductId !== undefined && String(product.id) === String(excludeProductId)) return null

  const sameProducer = String(product.producer_id || '') === String(proposal.producer_id || '')
  const proposedName = normalise(proposal.product_name)
  const candidateName = normalise(product.product_name)
  const exactName = Boolean(proposedName) && candidateName === proposedName
  const similarName = Boolean(proposedName) && (candidateName.includes(proposedName) || proposedName.includes(candidateName))
  if (!sameProducer || (!exactName && !similarName)) return null

  const styleMatch = Boolean(proposal.product_category_id) && String(product.product_category_id || '') === String(proposal.product_category_id)
  const proposedEdition = normalise(proposal.edition)
  const candidateEdition = normalise(product.edition)
  const editionMatch = Boolean(proposedEdition && candidateEdition && proposedEdition === candidateEdition)
  const editionConflict = Boolean(proposedEdition && candidateEdition && proposedEdition !== candidateEdition)
  const strength = (exactName ? 4 : 2) + (styleMatch ? 2 : 0) + (editionMatch ? 2 : 0) - (editionConflict ? 1 : 0)

  return Object.freeze({ product, exactName, styleMatch, editionMatch, editionConflict, strength })
}

export const buildCatalogueDuplicateCandidates = (products, proposal, { excludeProductId = null } = {}) => Object.freeze(
  products
    .map((product) => candidateForProposal(product, proposal, excludeProductId))
    .filter(Boolean)
    .sort((left, right) => right.strength - left.strength || String(left.product.product_name).localeCompare(String(right.product.product_name)))
)

export const __testables = { candidateForProposal, normalise }
