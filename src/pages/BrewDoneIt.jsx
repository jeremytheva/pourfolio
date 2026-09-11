import React, { useCallback, useEffect, useRef, useState } from 'react'
import BrewDoneItGuess from '../components/BrewDoneItGuess.jsx'
import BrewDoneItInvite from '../components/BrewDoneItInvite.jsx'
import BrewDoneItQuestion from '../components/BrewDoneItQuestion.jsx'
import BrewDoneItRound from '../components/BrewDoneItRound.jsx'
import BrewDoneItScore from '../components/BrewDoneItScore.jsx'
import BrewDoneItSelection from '../components/BrewDoneItSelection.jsx'
import BrewDoneItSeriesList from '../components/BrewDoneItSeriesList.jsx'
import BrewDoneItStatistics from '../components/BrewDoneItStatistics.jsx'
import { beverageService } from '../services/beverageService.js'
import {
  askBrewDoneItQuestion,
  createBrewDoneItGame,
  createBrewDoneItRound,
  forfeitBrewDoneItRound,
  getBrewDoneItGame,
  getBrewDoneItGames,
  getBrewDoneItStats,
  joinBrewDoneItGame,
  submitBrewDoneItGuess
} from '../services/brewDoneItService.js'

const requestKey = () => `brew-done-it-${crypto.randomUUID()}`
const terminalRound = (round) => ['completed', 'forfeited'].includes(round?.status)

export default function BrewDoneIt({ user, initialProductId = '' }) {
  const [game, setGame] = useState(null)
  const [round, setRound] = useState(null)
  const [series, setSeries] = useState([])
  const [invitation, setInvitation] = useState(null)
  const [products, setProducts] = useState([])
  const [revealedProduct, setRevealedProduct] = useState(null)
  const [stats, setStats] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const lastAction = useRef(null)
  const role = String(round?.selector_participant_id) === String(user?.id) ? 'selector' : 'guesser'

  const run = useCallback(async (action, successMessage) => {
    setBusy(true)
    setError('')
    try {
      const result = await action()
      if (successMessage) setAnnouncement(successMessage(result))
      return result
    } catch (caught) {
      const stale = caught.status === 409 && !/expired/i.test(caught.message)
      setError(/expired/i.test(caught.message)
        ? 'This challenge has expired. Create or join another challenge.'
        : stale
          ? 'The challenge changed before your action was accepted. Refresh before trying again.'
          : caught.status === 0
            ? 'Brew Done It could not be reached. Check your connection and retry.'
            : 'That action could not be completed. Refresh the series and try again.')
      throw caught
    } finally {
      setBusy(false)
    }
  }, [])

  const loadRevealedProduct = useCallback(async (nextRound) => {
    if (!terminalRound(nextRound) || !nextRound?.selected_product_id) {
      setRevealedProduct(null)
      return
    }
    try {
      setRevealedProduct(await beverageService.getProduct(nextRound.selected_product_id))
    } catch {
      setRevealedProduct(null)
    }
  }, [])

  const loadSeries = useCallback(async () => {
    const payload = await getBrewDoneItGames()
    setSeries(Array.isArray(payload.series) ? payload.series : [])
  }, [])

  const loadStats = useCallback(async () => {
    setStats(await getBrewDoneItStats())
  }, [])

  const openSeries = useCallback(async (gameId, invitationCode = null) => {
    const result = await run(() => getBrewDoneItGame(gameId), () => 'Series loaded.')
    const latestRound = result.rounds?.at(-1) || null
    setGame(result.game)
    setRound(latestRound)
    setInvitation(invitationCode ? { gameId: result.game.id, code: invitationCode } : null)
    await loadRevealedProduct(latestRound)
  }, [loadRevealedProduct, run])

  const refresh = useCallback(async () => {
    if (!game?.id) return
    const result = await run(() => getBrewDoneItGame(game.id), () => 'Series updated.')
    const latestRound = result.rounds?.at(-1) || null
    setGame(result.game)
    setRound(latestRound)
    await loadRevealedProduct(latestRound)
    await Promise.all([loadSeries(), loadStats()])
  }, [game?.id, loadRevealedProduct, loadSeries, loadStats, run])

  useEffect(() => {
    beverageService.getProducts({ limit: 100 })
      .then((payload) => setProducts(payload.items || []))
      .catch(() => setError('Catalogue choices could not be loaded. Retry when your connection is available.'))
    Promise.all([loadSeries(), loadStats()]).catch(() => {})
  }, [loadSeries, loadStats])

  const remember = (action) => {
    lastAction.current = action
    return action()
  }

  const create = (productId) => {
    const key = requestKey()
    return remember(async () => {
      const result = await run(
        () => createBrewDoneItGame(productId, key),
        () => 'Challenge created. Send the challenge details to the other player.'
      )
      setGame(result.game)
      setRound(result.round)
      setInvitation({ gameId: result.game.id, code: result.invitationCode })
      await loadSeries()
    })
  }

  const join = ({ gameId, inviteCode }) => {
    const key = requestKey()
    return remember(async () => {
      const result = await run(
        () => joinBrewDoneItGame(gameId, inviteCode.trim(), 0, key),
        () => 'Challenge accepted. The hidden beer is ready to guess.'
      )
      setGame(result.game)
      setRound(result.round)
      setInvitation(null)
      await loadSeries()
    })
  }

  const ask = (question) => {
    const key = requestKey()
    return remember(async () => {
      const result = await run(
        () => askBrewDoneItQuestion(round.id, question, round.version || 0, key),
        (value) => `Answer: ${value.question.answer ? 'yes' : 'no'}.`
      )
      setRound(result.round)
      await loadSeries()
    })
  }

  const guess = (productId) => {
    const key = requestKey()
    return remember(async () => {
      const result = await run(
        () => submitBrewDoneItGuess(round.id, productId, round.version || 0, key),
        (value) => value.round.status === 'completed'
          ? `Correct. ${value.round.awarded_points || 0} points added to your record.`
          : 'Incorrect beer. The round remains open.'
      )
      setRound(result.round)
      await loadSeries()
      if (terminalRound(result.round)) {
        await loadRevealedProduct(result.round)
        await loadStats()
      }
    })
  }

  const startNextRound = (productId) => {
    const key = requestKey()
    return remember(async () => {
      const result = await run(
        () => createBrewDoneItRound(game.id, productId, game.version || 0, key),
        () => 'Next round created. Your opponent can now guess the new beer.'
      )
      setGame(result.game)
      setRound(result.round)
      setRevealedProduct(null)
      await loadSeries()
    })
  }

  const forfeit = async () => {
    if (!window.confirm('Forfeit this round? It will end with zero points for the guesser.')) return
    const result = await run(
      () => forfeitBrewDoneItRound(round.id, round.version || 0, requestKey()),
      () => 'Round forfeited. The series remains available for another round.'
    )
    setRound(result.round)
    await loadRevealedProduct(result.round)
    await Promise.all([loadSeries(), loadStats()])
  }

  const returnToChallenges = async () => {
    setGame(null)
    setRound(null)
    setInvitation(null)
    setRevealedProduct(null)
    setError('')
    await loadSeries().catch(() => undefined)
  }

  const canStartNextRound = game?.status === 'active' && terminalRound(round) && role === 'guesser'

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Persistent two-player challenge</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900">Brew Done It</h1>
        <p className="mt-2 max-w-2xl text-gray-600">Choose a beer, challenge another signed-in player on their own device, and build a head-to-head score across rounds over time.</p>
      </header>

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-950">
          <p>{error}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" className="rounded-md bg-red-800 px-3 py-2 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2" onClick={() => lastAction.current?.()}>Retry action</button>
            {game && <button type="button" className="rounded-md border border-red-800 px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-red-600" onClick={refresh}>Refresh series</button>}
            <button type="button" className="rounded-md px-3 py-2 underline focus:outline-none focus:ring-2 focus:ring-red-600" onClick={returnToChallenges}>Return to challenges</button>
          </div>
        </div>
      )}

      {!game && (
        <>
          <BrewDoneItSeriesList series={series} userId={user?.id} busy={busy} onOpen={openSeries} />
          <BrewDoneItInvite products={products} invitation={invitation} busy={busy} initialProductId={initialProductId} onCreate={create} onJoin={join} />
        </>
      )}

      {game && (
        <button type="button" className="underline focus:outline-none focus:ring-2 focus:ring-amber-500" disabled={busy} onClick={returnToChallenges}>All challenges</button>
      )}

      {game?.status === 'waiting' && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-6" aria-labelledby="waiting-heading">
          <h2 id="waiting-heading" className="text-xl font-semibold text-amber-950">Challenge waiting for another player</h2>
          <p className="mt-2 text-amber-950">Series {game.id} is waiting to be accepted. Your selected beer remains hidden from the invited player.</p>
          {invitation && <p className="mt-3 break-all font-mono text-sm">Game {invitation.gameId}: {invitation.code}</p>}
          <button type="button" className="mt-4 underline focus:outline-none focus:ring-2 focus:ring-amber-500" disabled={busy} onClick={refresh}>Refresh challenge</button>
        </section>
      )}

      {game?.status === 'active' && round && !terminalRound(round) && (
        <BrewDoneItRound game={game} round={round} role={role} busy={busy} onRefresh={refresh} onForfeit={forfeit}>
          {role === 'selector' && (
            <p role="status" className="rounded-lg bg-blue-50 p-4 text-blue-950">Your beer is locked in. The other player can ask catalogue questions and submit beer guesses from their device.</p>
          )}
          {role === 'guesser' && round.status === 'guessing' && (
            <>
              <BrewDoneItQuestion products={products} busy={busy} onAsk={ask} />
              <BrewDoneItGuess products={products} busy={busy} onGuess={guess} />
            </>
          )}
        </BrewDoneItRound>
      )}

      {terminalRound(round) && (
        <>
          <BrewDoneItScore round={round} selectedProduct={revealedProduct} />
          {canStartNextRound ? (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <BrewDoneItSelection products={products} busy={busy} onSelect={startNextRound} />
            </section>
          ) : game?.status === 'active' ? (
            <div role="status" className="rounded-lg bg-blue-50 p-4 text-blue-950">The other player chooses the beer for the next round. Refresh this series after they have created it.</div>
          ) : null}
        </>
      )}

      <BrewDoneItStatistics stats={stats} />
    </div>
  )
}
