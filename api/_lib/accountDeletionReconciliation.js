import {
  ACCOUNT_DELETION_PLAN_COLLECTION_ORDER,
  ACCOUNT_DELETION_PLAN_FORMAT,
  ACCOUNT_DELETION_PLAN_SCHEMA_VERSION,
  buildAccountDeletionPlan
} from './accountDeletionPlan.js'

export const ACCOUNT_DELETION_RECONCILIATION_FORMAT =
  'pourfolio.account-deletion-reconciliation'
export const ACCOUNT_DELETION_RECONCILIATION_SCHEMA_VERSION = '1.0.0'

const PLAN_KEYS = Object.freeze([
  'format',
  'schema_version',
  'generated_at',
  'total_records',
  'record_counts',
  'steps'
])
const STEP_KEYS = Object.freeze(['sequence', 'collection', 'count', 'record_ids'])

const isPlainObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const assertExactKeys = (value, expectedKeys, label) => {
  const actualKeys = Object.keys(value).sort()
  const canonicalKeys = [...expectedKeys].sort()
  if (actualKeys.length !== canonicalKeys.length ||
      actualKeys.some((key, index) => key !== canonicalKeys[index])) {
    throw new Error(`${label} keys are invalid.`)
  }
}

const canonicalIsoDateTime = (value, label) => {
  if (typeof value !== 'string' || !value) throw new Error(`${label} is invalid.`)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`${label} is invalid.`)
  return date.toISOString()
}

const nonNegativeSafeInteger = (value, label) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} is invalid.`)
  }
  return value
}

const validateCanonicalRecordIds = (recordIds, collection) => {
  if (!Array.isArray(recordIds)) {
    throw new Error(`Account deletion plan ${collection} identifiers are invalid.`)
  }

  const seen = new Set()
  for (let index = 0; index < recordIds.length; index += 1) {
    const identifier = recordIds[index]
    if (typeof identifier !== 'string' || !identifier.trim()) {
      throw new Error(`Account deletion plan ${collection} contains an invalid identifier.`)
    }
    if (seen.has(identifier)) {
      throw new Error(`Account deletion plan ${collection} contains duplicate identifiers.`)
    }
    if (index > 0 && recordIds[index - 1] > identifier) {
      throw new Error(`Account deletion plan ${collection} identifiers are not sorted.`)
    }
    seen.add(identifier)
  }

  return recordIds
}

const validatePlan = (plan) => {
  if (!isPlainObject(plan)) throw new Error('Account deletion plan is invalid.')
  assertExactKeys(plan, PLAN_KEYS, 'Account deletion plan')

  if (plan.format !== ACCOUNT_DELETION_PLAN_FORMAT) {
    throw new Error('Account deletion plan format is unsupported.')
  }
  if (plan.schema_version !== ACCOUNT_DELETION_PLAN_SCHEMA_VERSION) {
    throw new Error('Account deletion plan schema version is unsupported.')
  }

  const canonicalGeneratedAt = canonicalIsoDateTime(
    plan.generated_at,
    'Account deletion plan generation time'
  )
  if (plan.generated_at !== canonicalGeneratedAt) {
    throw new Error('Account deletion plan generation time is not canonical.')
  }

  const totalRecords = nonNegativeSafeInteger(
    plan.total_records,
    'Account deletion plan total record count'
  )
  if (!isPlainObject(plan.record_counts)) {
    throw new Error('Account deletion plan record counts are invalid.')
  }
  assertExactKeys(
    plan.record_counts,
    ACCOUNT_DELETION_PLAN_COLLECTION_ORDER,
    'Account deletion plan record counts'
  )

  if (!Array.isArray(plan.steps) ||
      plan.steps.length !== ACCOUNT_DELETION_PLAN_COLLECTION_ORDER.length) {
    throw new Error('Account deletion plan steps are invalid.')
  }

  let reconciledTotal = 0
  for (let index = 0; index < ACCOUNT_DELETION_PLAN_COLLECTION_ORDER.length; index += 1) {
    const collection = ACCOUNT_DELETION_PLAN_COLLECTION_ORDER[index]
    const step = plan.steps[index]
    if (!isPlainObject(step)) {
      throw new Error(`Account deletion plan ${collection} step is invalid.`)
    }
    assertExactKeys(step, STEP_KEYS, `Account deletion plan ${collection} step`)

    if (step.sequence !== index + 1 || step.collection !== collection) {
      throw new Error('Account deletion plan step order is invalid.')
    }

    const stepCount = nonNegativeSafeInteger(
      step.count,
      `Account deletion plan ${collection} step count`
    )
    const mappedCount = nonNegativeSafeInteger(
      plan.record_counts[collection],
      `Account deletion plan ${collection} record count`
    )
    const recordIds = validateCanonicalRecordIds(step.record_ids, collection)
    if (stepCount !== recordIds.length || mappedCount !== stepCount) {
      throw new Error(`Account deletion plan ${collection} counts do not reconcile.`)
    }

    reconciledTotal += stepCount
    if (!Number.isSafeInteger(reconciledTotal)) {
      throw new Error('Account deletion plan total record count is invalid.')
    }
  }

  if (totalRecords !== reconciledTotal) {
    throw new Error('Account deletion plan total record count does not reconcile.')
  }

  return plan
}

const buildCollectionResult = (plannedStep, currentStep) => {
  const plannedIds = new Set(plannedStep.record_ids)
  const currentIds = new Set(currentStep.record_ids)
  const remainingPlannedCount = plannedStep.record_ids.reduce(
    (count, identifier) => count + Number(currentIds.has(identifier)),
    0
  )
  const unplannedCount = currentStep.record_ids.reduce(
    (count, identifier) => count + Number(!plannedIds.has(identifier)),
    0
  )

  return Object.freeze({
    sequence: plannedStep.sequence,
    collection: plannedStep.collection,
    planned_count: plannedStep.count,
    removed_planned_count: plannedStep.count - remainingPlannedCount,
    remaining_planned_count: remainingPlannedCount,
    unplanned_count: unplannedCount,
    remaining_total_count: currentStep.count
  })
}

export const reconcileAccountDeletionPlan = ({
  account,
  plan,
  snapshot,
  verifiedAt = new Date().toISOString()
}) => {
  const sourcePlan = validatePlan(plan)
  const verified_at = canonicalIsoDateTime(
    verifiedAt,
    'Account deletion reconciliation verification time'
  )
  if (Date.parse(verified_at) < Date.parse(sourcePlan.generated_at)) {
    throw new Error('Account deletion reconciliation cannot precede plan generation.')
  }

  const currentPlan = buildAccountDeletionPlan({
    account,
    snapshot,
    generatedAt: verified_at
  })
  const collectionResults = Object.freeze(sourcePlan.steps.map((plannedStep, index) =>
    buildCollectionResult(plannedStep, currentPlan.steps[index])
  ))

  const totals = collectionResults.reduce((result, collection) => ({
    planned: result.planned + collection.planned_count,
    removedPlanned: result.removedPlanned + collection.removed_planned_count,
    remainingPlanned: result.remainingPlanned + collection.remaining_planned_count,
    unplanned: result.unplanned + collection.unplanned_count,
    remaining: result.remaining + collection.remaining_total_count
  }), {
    planned: 0,
    removedPlanned: 0,
    remainingPlanned: 0,
    unplanned: 0,
    remaining: 0
  })

  const sourcePlanSummary = Object.freeze({
    format: sourcePlan.format,
    schema_version: sourcePlan.schema_version,
    generated_at: sourcePlan.generated_at
  })

  return Object.freeze({
    format: ACCOUNT_DELETION_RECONCILIATION_FORMAT,
    schema_version: ACCOUNT_DELETION_RECONCILIATION_SCHEMA_VERSION,
    verified_at,
    source_plan: sourcePlanSummary,
    planned_total_count: totals.planned,
    removed_planned_total_count: totals.removedPlanned,
    remaining_planned_total_count: totals.remainingPlanned,
    unplanned_total_count: totals.unplanned,
    remaining_total_count: totals.remaining,
    complete: totals.remaining === 0,
    collection_results: collectionResults
  })
}
