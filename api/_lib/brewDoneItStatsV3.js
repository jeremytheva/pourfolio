import { COLLECTIONS } from '../../src/data/contract.js'
import { dataProvider } from './dataProvider.js'

const list = (value) => (Array.isArray(value) ? value : value ? [value] : []).filter((item) => item && typeof item === 'object')
const terminalRound = (round) => ['completed', 'forfeited'].includes(round?.status)
const trueFlag = (value) => value === true || value === 1 || value === '1'
const safePoints = (value) => {
  const points = Number(value)
  return Number.isFinite(points) && points >= 0 && points <= 10 ? points : 0
}
const validTimestamp = (value) => {
  const timestamp = Date.parse(value || '')
  return Number.isFinite(timestamp) ? timestamp : null
}

const gamesForUser = async (userId) => {
  const [created, joined] = await Promise.all([
    dataProvider.list(COLLECTIONS.brewDoneItGames, { creator_participant_id: userId }),
    dataProvider.list(COLLECTIONS.brewDoneItGames, { opponent_participant_id: userId })
  ])
  const byId = new Map()
  for (const game of [...list(created), ...list(joined)]) {
    if (game?.id !== null && game?.id !== undefined && game.opponent_participant_id) byId.set(String(game.id), game)
  }
  return [...byId.values()]
}

export const statsForUserV3 = async (response, user) => {
  const games = await gamesForUser(user.id)
  const roundsByGame = await Promise.all(games.map(async (game) => ({
    game,
    rounds: list(await dataProvider.list(COLLECTIONS.brewDoneItRounds, { game_id: game.id })).filter(terminalRound)
  })))

  const headToHead = new Map()
  let completedRounds = 0
  let roundsAsGuesser = 0
  let brewerySolved = 0
  let exactBeerSolved = 0
  let styleFallbackSolved = 0
  let awardedPoints = 0

  for (const { game, rounds } of roundsByGame) {
    const opponentId = String(game.creator_participant_id) === String(user.id) ? game.opponent_participant_id : game.creator_participant_id
    const key = String(opponentId)
    const aggregate = headToHead.get(key) || {
      opponentParticipantId: opponentId,
      completedRounds: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      brewerySolvedFor: 0,
      brewerySolvedAgainst: 0,
      exactBeerSolvedFor: 0,
      exactBeerSolvedAgainst: 0,
      styleFallbackSolvedFor: 0,
      styleFallbackSolvedAgainst: 0,
      lastPlayedAt: null
    }

    for (const round of rounds) {
      completedRounds += 1
      aggregate.completedRounds += 1
      const userWasGuesser = String(round.guesser_participant_id) === String(user.id)
      const scored = round.status === 'completed'
      const points = scored ? safePoints(round.awarded_points) : 0
      const brewery = scored && trueFlag(round.brewery_correct)
      const exactBeer = scored && trueFlag(round.beer_correct)
      const styleFallback = scored && trueFlag(round.style_correct) && !exactBeer

      if (userWasGuesser) {
        roundsAsGuesser += 1
        awardedPoints += points
        aggregate.pointsFor += points
        if (brewery) { brewerySolved += 1; aggregate.brewerySolvedFor += 1 }
        if (exactBeer) { exactBeerSolved += 1; aggregate.exactBeerSolvedFor += 1 }
        if (styleFallback) { styleFallbackSolved += 1; aggregate.styleFallbackSolvedFor += 1 }
      } else {
        aggregate.pointsAgainst += points
        if (brewery) aggregate.brewerySolvedAgainst += 1
        if (exactBeer) aggregate.exactBeerSolvedAgainst += 1
        if (styleFallback) aggregate.styleFallbackSolvedAgainst += 1
      }

      const completedAt = validTimestamp(round.completed_at)
      const lastPlayedAt = validTimestamp(aggregate.lastPlayedAt)
      if (completedAt !== null && (lastPlayedAt === null || completedAt > lastPlayedAt)) aggregate.lastPlayedAt = round.completed_at
    }
    headToHead.set(key, aggregate)
  }

  response.status(200).json({
    seriesCount: games.length,
    completedRounds,
    roundsAsGuesser,
    brewerySolved,
    exactBeerSolved,
    styleFallbackSolved,
    correctGuesses: exactBeerSolved,
    awardedPoints,
    averagePointsPerGuessingRound: roundsAsGuesser ? Number((awardedPoints / roundsAsGuesser).toFixed(2)) : 0,
    headToHead: [...headToHead.values()].sort((a, b) => (validTimestamp(b.lastPlayedAt) || 0) - (validTimestamp(a.lastPlayedAt) || 0))
  })
}

export const __testables = { terminalRound, trueFlag, safePoints, validTimestamp }