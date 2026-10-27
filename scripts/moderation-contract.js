// Offline target-contract checks and fixtures only. No provider adapter or
// application permission grant; mutable moderation remains disabled.
const sameSet = (actual, expected) => Array.isArray(actual) && actual.length === expected.length &&
  new Set(actual).size === actual.length && expected.every((value) => actual.includes(value))
const recordFields = {
  entity: ['entity_type', 'entity_id', 'record_version', 'content_version', 'approved_content_version', 'verification_state', 'exposure_state', 'submitter_id', 'created_at', 'updated_at', 'last_decision_id'],
  proposal: ['proposal_id', 'entity_type', 'entity_id', 'base_content_version', 'proposed_fields', 'evidence', 'submitter_id', 'submission_key', 'status', 'proposal_version', 'created_at', 'updated_at'],
  decision: ['decision_id', 'operation_id', 'entity_type', 'entity_id', 'action', 'actor_id', 'reviewed_record_version', 'reviewed_content_version', 'resulting_record_version', 'resulting_content_version', 'previous_state', 'next_state', 'permitted_diff', 'dependency_versions', 'reason', 'evidence', 'committed_at'],
  operation: ['operation_id', 'actor_id', 'idempotency_key', 'intent_fingerprint', 'entity_type', 'entity_id', 'base_record_version', 'base_content_version', 'state', 'checkpoints', 'created_at', 'updated_at', 'result_reference']
}
const transitions = {
  initialize: ['Submitter', ['absent'], 'pending', ['current_versions', 'durable_initialization']],
  approve: ['Admin', ['pending', 'needs_changes', 'unknown'], 'approved', ['current_versions', 'producer_dependencies_approved', 'evidence']],
  request_changes: ['Admin', ['pending'], 'needs_changes', ['current_versions', 'reason']],
  reject: ['Admin', ['pending', 'needs_changes', 'unknown'], 'rejected', ['current_versions', 'reason']],
  resubmit: ['Submitter', ['needs_changes', 'rejected'], 'pending', ['current_versions', 'original_submitter', 'new_proposal_revision', 'state_specific_resubmission']],
  apply_correction: ['Admin', ['approved'], 'approved', ['current_versions', 'producer_dependencies_approved', 'evidence', 'reason', 'validated_diff']],
  revoke_verification: ['Admin', ['approved'], 'needs_changes', ['current_versions', 'reason']]
}
const capabilities = ['unique_actor_operation_key', 'atomic_version_fence', 'atomic_commit_or_certified_fenced_recovery',
  'all_catalogue_writers_fenced', 'current_producer_dependency_fence', 'complete_snapshot_and_isolated_restore', 'provider_role_write_denial_and_revocation']

export const validateModerationTarget = (target) => {
  const findings = []
  const add = (code) => findings.push({ code })
  if (!target || target.classification !== 'DEFERRED_TARGET' || target.target_version !== 1 ||
      target.mutable_enabled !== false || target.provider_mapping !== null || target.provider_evidence !== 'NOT_RUN') add('MODERATION_TARGET_ENABLEMENT_INVALID')
  if (!sameSet(target?.entity_types, ['product', 'producer'])) add('MODERATION_TARGET_ENTITIES_INVALID')
  if (target?.identity?.entity_id !== 'canonical_positive_decimal_string' || target?.identity?.actor_id !== 'opaque_verified_session_id' ||
      target?.identity?.record_ids !== 'opaque_server_generated_id' || target?.identity?.versions !== 'non_negative_safe_integer') add('MODERATION_TARGET_IDENTITY_INVALID')
  const verification = target?.verification
  if (!sameSet(verification?.persisted_states, ['pending', 'approved', 'needs_changes', 'rejected']) || verification?.legacy_projection !== 'unknown' ||
      verification?.legacy_rule !== 'missing_pre_activation_record_only' || !sameSet(verification?.pending_capabilities, ['search', 'view', 'rate', 'cellar']) ||
      !sameSet(verification?.exposure_states, ['normal', 'restricted']) || verification?.effective_approval !== 'current_content_and_current_producer_dependencies') add('MODERATION_TARGET_VISIBILITY_INVALID')
  const unique = { entity: [['entity_type', 'entity_id']], proposal: [['proposal_id', 'proposal_version'], ['submitter_id', 'submission_key']],
    decision: [['decision_id'], ['operation_id']], operation: [['operation_id'], ['actor_id', 'idempotency_key']] }
  for (const [name, fields] of Object.entries(recordFields)) {
    const record = target?.records?.[name]
    if (!record || record.provider_collection !== null || !sameSet(record.logical_fields, fields) ||
        JSON.stringify(record.unique_keys) !== JSON.stringify(unique[name])) add(`MODERATION_TARGET_${name.toUpperCase()}_INVALID`)
  }
  if (!sameSet(Object.keys(target?.records || {}), Object.keys(recordFields))) add('MODERATION_TARGET_RECORDS_INVALID')
  if (!sameSet(target?.records?.proposal?.states, ['pending', 'needs_changes', 'accepted', 'rejected', 'superseded']) ||
      !sameSet(target?.records?.operation?.states, ['prepared', 'committing', 'reconciling', 'committed', 'blocked'])) add('MODERATION_TARGET_WORKFLOW_STATES_INVALID')
  if (!sameSet(target?.editable_fields?.product, ['product_name', 'product_category_id', 'abv', 'ibu', 'declared_category', 'edition']) ||
      !sameSet(target?.editable_fields?.producer, ['producer_name', 'address', 'suburb_id'])) add('MODERATION_TARGET_EDIT_FIELDS_INVALID')
  const relationships = target?.producer_relationships
  if (relationships?.source_collection !== 'product_producers' || relationships?.complete_set_required !== true ||
      relationships?.primary_count !== 1 || relationships?.sort_order_server_owned !== true ||
      relationships?.restricted_dependency_rule !== 'deny_new_dependent_exposure_and_require_review') add('MODERATION_TARGET_RELATIONSHIPS_INVALID')
  const version = target?.versions
  if (!sameSet(version?.review_requires, ['record_version', 'content_version', 'producer_dependency_versions', 'producer_relation_fingerprint']) ||
      version?.record_advances !== 'every_committed_decision' || version?.content_advances !== 'material_content_or_attribution_change' ||
      version?.approved_content_matches_current !== true) add('MODERATION_TARGET_VERSIONS_INVALID')
  const resubmission = target?.resubmission
  if (resubmission?.needs_changes_requires !== 'validated_field_or_evidence_diff' ||
      resubmission?.rejected_requires !== 'recorded_response_to_prior_reason') add('MODERATION_TARGET_RESUBMISSION_INVALID')
  const rows = target?.verification_transitions
  if (!Array.isArray(rows) || !sameSet(rows.map((row) => row?.action), Object.keys(transitions))) add('MODERATION_TARGET_TRANSITIONS_INVALID')
  else for (const row of rows) {
    const [actor, from, to, guards] = transitions[row.action]
    if (row.actor !== actor || row.to_state !== to || !sameSet(row.from_states, from) || !sameSet(row.guards, guards)) add('MODERATION_TARGET_TRANSITION_INVALID')
  }
  const exposure = target?.exposure
  if (!sameSet(exposure?.actions, ['restrict', 'unrestrict']) || exposure?.actor !== 'Admin' || !sameSet(exposure?.guards, ['current_versions', 'reason']) ||
      exposure?.independent_of_verification !== true || exposure?.resubmission_preserves_restriction !== true ||
      exposure?.restricted_new_activity !== 'deny' || exposure?.historical_reference !== 'safe_identity_placeholder') add('MODERATION_TARGET_EXPOSURE_INVALID')
  const reliability = target?.reliability
  if (!sameSet(reliability?.required_capabilities, capabilities) || reliability?.same_key_same_intent !== 'return_original_result' ||
      reliability?.same_key_different_intent !== 'conflict' || reliability?.unknown_result !== 'reconcile_original_operation' ||
      reliability?.audit !== 'append_only_allowlisted_diff') add('MODERATION_TARGET_RELIABILITY_INVALID')
  const migration = target?.migration
  if (migration?.mode !== 'additive_only' || migration?.schema_inventory !== 'UNVERIFIED' || migration?.legacy_backfill !== 'none_without_review' ||
      migration?.activation !== 'after_provider_and_all_writer_certification' || migration?.rollback !== 'disable_commands_preserve_records' ||
      migration?.plan !== 'docs/nocodebackend/moderation-migration-plan.md') add('MODERATION_TARGET_MIGRATION_INVALID')
  return findings
}

// Interprets synthetic fixtures against proposed state transitions. ELIGIBLE is
// a specification result, never a permission, provider result or commit success.
export const evaluateModerationFixture = (target, fixture) => {
  const result = (outcome, code) => ({ outcome, code })
  if (validateModerationTarget(target).length) return result('DENIED', 'INVALID_TARGET')
  if (!fixture || !target.entity_types.includes(fixture.entityType) || typeof fixture.entityId !== 'string' ||
      !/^[1-9]\d{0,127}$/.test(fixture.entityId) || typeof fixture.actorId !== 'string' ||
      !fixture.actorId || fixture.actorId.length > 200 || /\s/.test(fixture.actorId) ||
      typeof fixture.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(fixture.fingerprint) ||
      !target.verification.exposure_states.includes(fixture.exposure)) return result('DENIED', 'INVALID_ENTITY')
  const transition = target.verification_transitions.find((row) => row.action === fixture.action)
  if (!transition || transition.actor !== fixture.actor) return result('DENIED', 'ACTOR_OR_ACTION')
  if (transition.guards.includes('original_submitter') && fixture.isSubmitter !== true) return result('DENIED', 'GUARD')
  if (fixture.operation) {
    if (fixture.operation.actorId !== fixture.actorId) return result('DENIED', 'OPERATION_ACTOR')
    if (!target.records.operation.states.includes(fixture.operation.state)) return result('DENIED', 'INVALID_OPERATION')
    if (fixture.operation.fingerprint !== fixture.fingerprint) return result('CONFLICT', 'KEY_INTENT_MISMATCH')
    if (fixture.operation.state === 'blocked') return result('BLOCKED', 'ORIGINAL_OPERATION')
    return result(fixture.operation.state === 'committed' ? 'REPLAY' : 'RECONCILE', 'ORIGINAL_OPERATION')
  }
  const versions = [fixture.currentRecordVersion, fixture.expectedRecordVersion, fixture.currentContentVersion, fixture.reviewedContentVersion]
  if (versions.some((value) => !Number.isSafeInteger(value) || value < 0 || value === Number.MAX_SAFE_INTEGER)) return result('DENIED', 'INVALID_VERSION')
  if (fixture.currentRecordVersion !== fixture.expectedRecordVersion || fixture.currentContentVersion !== fixture.reviewedContentVersion) return result('CONFLICT', 'STALE_REVIEW')
  if (fixture.state === 'unknown' && fixture.legacyPreActivation !== true) return result('DENIED', 'MISSING_NEW_MODERATION')
  if (!transition.from_states.includes(fixture.state)) return result('DENIED', 'TRANSITION')
  const checks = { current_versions: true, durable_initialization: fixture.durableInitialization === true,
    producer_dependencies_approved: fixture.entityType === 'producer' || fixture.producersApproved === true,
    evidence: fixture.evidence === true, reason: fixture.reason === true, original_submitter: fixture.isSubmitter === true,
    new_proposal_revision: fixture.newRevision === true, validated_diff: fixture.validatedDiff === true,
    state_specific_resubmission: fixture.state === 'needs_changes'
      ? fixture.validatedResubmissionDiff === true
      : fixture.state === 'rejected' && fixture.responseToPriorReason === true }
  if (transition.guards.some((guard) => checks[guard] !== true)) return result('DENIED', 'GUARD')
  return { outcome: 'ELIGIBLE', code: 'TARGET_TRANSITION', nextState: transition.to_state, exposure: fixture.exposure }
}
