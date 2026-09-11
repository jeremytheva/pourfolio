import { COLLECTIONS } from '../../src/data/contract.js'
import { dataProvider } from './dataProvider.js'

const list = (value) => (Array.isArray(value) ? value : value ? [value] : []).filter((item) => item && typeof item === 'object')
const participant = (game, userId) => [game?.creator_participant_id, game?.opponent_participant_id]
  .filter((value) => value !== null && value !== undefined).some((value) => String(value) === String(userId))

export const statsForUserV3 = async (response, user) => {
  const games = list(await dataProvider.list(COLLECTIONS.brewDoneItGames))
    .filter((game) => participant(game, user.id) && game.opponent_participant_id)
  const roundsByGame = await Promise.all(games.map(async (game) => ({
    game,
    rounds: list(await dataProvider.list(COLLECTIONS.brewDoneItRounds, { game_id: game.id })).filter((round) => round.status === 'completed')
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
      const points = Number(round.awarded_points || 0)
      const brewery = Boolean(round.brewery_correct)
      const exactBeer = Boolean(round.beer_correct)
      const styleFallback = Boolean(round.style_correct) && !exactBeer

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
      if (!aggregate.lastPlayedAt || Date.parse(round.completed_at || 0) > Date.parse(aggregate.lastPlayedAt || 0)) aggregate.lastPlayedAt = round.completed_at
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
    headToHead: [...headToHead.values()].sort((a, b) => Date.parse(b.lastPlayedAt || 0) - Date.parse(a.lastPlayedAt || 0))
  })
}
