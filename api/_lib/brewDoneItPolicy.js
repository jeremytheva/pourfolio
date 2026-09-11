const GAME_FIELDS = Object.freeze([
  'id',
  'creator_participant_id',
  'opponent_participant_id',
  'status',
  'current_round_number',
  'created_at',
  'joined_at',
  'last_activity_at',
  'expires_at',
  'archived_at',
  'version'
])

const ROUND_FIELDS = Object.freeze([
  'id',
  'game_id',
  'round_number',
  'selector_participant_id',
  'guesser_participant_id',
  'status',
  'turn_sequence',
  'max_turns',
  'question_count',
  'incorrect_guess_count',
  'created_at',
  'started_at',
  'completed_at',
  'completion_reason',
  'scoring_rules_version',
  'awarded_points',
  'score_breakdown',
  'version'
])

const GUESS_FIELDS = Object.freeze([
  'id',
  'round_id',
  'turn_sequence',
  'guessed_product_id',
  'is_correct',
  'created_at'
])

const QUESTION_FIELDS = Object.freeze([
  'id',
  'round_id',
  'turn_sequence',
  'question_type',
  'reference_id',
  'threshold',
  'answer',
  'created_at'
])

export const BREW_DONE_IT_QUESTION_TYPES = Object.freeze({
  producer: 'producer',
  category: 'category',
  abvAtLeast: 'abv_at_least',
  ibuAtLeast: 'ibu_at_least',
  collaboration: 'collaboration'
})

export const BREW_DONE_IT_ABV_THRESHOLDS = Object.freeze([4, 5, 6, 7, 8, 10])
export const BREW_DONE_IT_IBU_THRESHOLDS = Object.freeze([20, 40, 60, 80])

const pickFields = (record, fields) => {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null
  return fields.reduce((result, field) => {
    if (record[field] !== undefined) result[field] = record[field]
    return result
  }, {})
}

const requirePlainObject = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    const error = new Error('Request data is invalid.')
    error.status = 400
    throw error
  }
  return input
}

const positiveId = (value, label) => {
  const result = String(value ?? '').trim()
  if (!/^[1-9]\d*$/.test(result)) {
    const error = new Error(`${label} is invalid.`)
    error.status = 400
    throw error
  }
  return result
}

export const sanitiseBrewDoneItCreateInput = (input) => {
  const body = requirePlainObject(input)
  return { productId: positiveId(body.productId, 'Product identifier') }
}

export const sanitiseBrewDoneItJoinInput = (input) => {
  const body = requirePlainObject(input)
  const inviteCode = String(body.inviteCode ?? '').trim()
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(inviteCode)) {
    const error = new Error('Invitation code is invalid.')
    error.status = 400
    throw error
  }
  return { inviteCode }
}

export const sanitiseBrewDoneItGuessInput = (input) => {
  const body = requirePlainObject(input)
  return { productId: positiveId(body.productId, 'Product identifier') }
}

export const sanitiseBrewDoneItQuestionInput = (input) => {
  const body = requirePlainObject(input)
  const questionType = String(body.questionType ?? '').trim()
  if (!Object.values(BREW_DONE_IT_QUESTION_TYPES).includes(questionType)) {
    const error = new Error('Question type is invalid.')
    error.status = 400
    throw error
  }

  if (questionType === BREW_DONE_IT_QUESTION_TYPES.producer || questionType === BREW_DONE_IT_QUESTION_TYPES.category) {
    return { questionType, referenceId: positiveId(body.referenceId, 'Question reference'), threshold: null }
  }

  if (questionType === BREW_DONE_IT_QUESTION_TYPES.abvAtLeast) {
    const threshold = Number(body.threshold)
    if (!BREW_DONE_IT_ABV_THRESHOLDS.includes(threshold)) {
      const error = new Error('ABV threshold is invalid.')
      error.status = 400
      throw error
    }
    return { questionType, referenceId: null, threshold }
  }

  if (questionType === BREW_DONE_IT_QUESTION_TYPES.ibuAtLeast) {
    const threshold = Number(body.threshold)
    if (!BREW_DONE_IT_IBU_THRESHOLDS.includes(threshold)) {
      const error = new Error('IBU threshold is invalid.')
      error.status = 400
      throw error
    }
    return { questionType, referenceId: null, threshold }
  }

  return { questionType, referenceId: null, threshold: null }
}

export const projectBrewDoneItGame = (record) => pickFields(record, GAME_FIELDS)
export const projectBrewDoneItGuess = (record) => pickFields(record, GUESS_FIELDS)
export const projectBrewDoneItQuestion = (record) => pickFields(record, QUESTION_FIELDS)

export const projectBrewDoneItRound = (record, viewerId) => {
  const projected = pickFields(record, ROUND_FIELDS)
  const selectorViewing = String(record?.selector_participant_id) === String(viewerId)
  const roundEnded = ['completed', 'forfeited'].includes(record?.status)
  if (selectorViewing || roundEnded) projected.selected_product_id = record?.selected_product_id
  return projected
}

export const __testables = {
  GAME_FIELDS,
  ROUND_FIELDS,
  GUESS_FIELDS,
  QUESTION_FIELDS,
  positiveId
}
