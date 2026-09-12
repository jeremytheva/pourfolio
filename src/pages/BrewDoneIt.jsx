import React, { useCallback, useEffect, useRef, useState } from 'react'
import BrewDoneItDeductionBoard from '../components/BrewDoneItDeductionBoard.jsx'
import BrewDoneItInvitationExpiry from '../components/BrewDoneItInvitationExpiry.jsx'
import BrewDoneItInvitationShare from '../components/BrewDoneItInvitationShare.jsx'
import BrewDoneItInvite from '../components/BrewDoneItInvite.jsx'
import BrewDoneItRound from '../components/BrewDoneItRound.jsx'
import BrewDoneItScore from '../components/BrewDoneItScore.jsx'
import BrewDoneItSelection from '../components/BrewDoneItSelection.jsx'
import BrewDoneItSelectorSheet from '../components/BrewDoneItSelectorSheet.jsx'
import BrewDoneItSeriesList from '../components/BrewDoneItSeriesList.jsx'
import BrewDoneItStatistics from '../components/BrewDoneItStatistics.jsx'
import { beverageService } from '../services/beverageService.js'
import {
  completeBrewDoneItRound,
  createBrewDoneItGame,
  createBrewDoneItRound,
  forfeitBrewDoneItRound,
  getBrewDoneItDeductions,
  getBrewDoneItGame,
  getBrewDoneItGames,
  getBrewDoneItOptions,
  getBrewDoneItSelectorClues,
  getBrewDoneItStats,
  joinBrewDoneItGame,
  saveBrewDoneItDeduction,
  setBrewDoneItHistorySharing,
  submitBrewDoneItOutcome
} from '../services/brewDoneItService.js'
import { isBrewDoneItInvitationExpired } from '../utils/brewDoneItInvitation.js'
import { mergeProjectedRoundGuess } from '../utils/brewDoneItRoundState.js'

const requestKey = () => `brew-done-it-${crypto.randomUUID()}`
const terminalRound = (round) => ['completed', 'forfeited'].includes(round?.status)
const roleFor = (round, user) => String(round?.selector_participant_id) === String(user?.id) ? 'selector' : 'guesser'

export default function BrewDoneIt({ user, initialProductId = '' }) {
  const [game, setGame] = useState(null)
  const [round, setRound] = useState(null)
  const [series, setSeries] = useState([])
  const [invitation, setInvitation] = useState(null)
  const [options, setOptions] = useState({ breweries: [], styles: [], beers: [], capabilities: {} })
  const [deductions, setDeductions] = useState([])
  const [selectorClues, setSelectorClues] = useState(null)
  const [cluesLoading, setCluesLoading] = useState(false)
  const [revealedProduct, setRevealedProduct] = useState(null)
  const [stats, setStats] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const lastAction = useRef(null)
  const role = roleFor(round, user)

  const run = useCallback(async (action, successMessage) => {
    setBusy(true)
    setError('')
    try {
      const result = await action()
      if (successMessage) setAnnouncement(successMessage(result))
      return result
    } catch (caught) {
      const expired = /expired/i.test(caught.message || '')
      const stale = caught.code === 'VERSION_CONFLICT'
      const safeBusinessError = caught.status >= 400 && caught.status < 500 && caught.message
      setError(expired
        ? 'This challenge has expired. Create or join another challenge.'
        : stale
          ? 'The challenge changed before your action was accepted. Refresh before trying again.'
          : caught.status === 0
            ? 'Brew Done It could not be reached. Check your connection and retry.'
            : safeBusinessError
              ? caught.message
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
    try { setRevealedProduct(await beverageService.getProduct(nextRound.selected_product_id)) } catch { setRevealedProduct(null) }
  }, [])

  const loadSeries = useCallback(async () => {
    const payload = await getBrewDoneItGames()
    setSeries(Array.isArray(payload.series) ? payload.series : [])
  }, [])

  const loadStats = useCallback(async () => setStats(await getBrewDoneItStats()), [])

  const loadRoundWorkspace = useCallback(async (nextRound) => {
    setDeductions([])
    setSelectorClues(null)
    if (!nextRound || terminalRound(nextRound) || nextRound.status !== 'guessing') return
    const nextRole = roleFor(nextRound, user)
    if (nextRole === 'selector') {
      setCluesLoading(true)
      try { setSelectorClues(await getBrewDoneItSelectorClues(nextRound.id)) } finally { setCluesLoading(false) }
      return
    }
    const payload = await getBrewDoneItDeductions(nextRound.id)
    setDeductions(Array.isArray(payload.deductions) ? payload.deductions : [])
  }, [user])

  const openSeries = useCallback(async (gameId, invitationCode = null) => {
    const result = await run(() => getBrewDoneItGame(gameId), () => 'Series loaded.')
    const latestRound = result.rounds?.at(-1) || null
    setGame(result.game)
    setRound(latestRound)
    setInvitation(invitationCode ? { gameId: result.game.id, code: invitationCode, expiresAt: result.game.expires_at } : null)
    await Promise.all([loadRevealedProduct(latestRound), loadRoundWorkspace(latestRound)])
  }, [loadRevealedProduct, loadRoundWorkspace, run])

  const refresh = useCallback(async () => {
    if (!game?.id) return
    const result = await run(() => getBrewDoneItGame(game.id), () => 'Series updated.')
    const latestRound = result.rounds?.at(-1) || null
    setGame(result.game)
    setRound(latestRound)
    setInvitation((current) => current ? { ...current, expiresAt: result.game.expires_at } : current)
    await Promise.all([loadRevealedProduct(latestRound), loadRoundWorkspace(latestRound), loadSeries(), loadStats()])
  }, [game?.id, loadRevealedProduct, loadRoundWorkspace, loadSeries, loadStats, run])

  useEffect(() => {
    getBrewDoneItOptions().then(setOptions).catch(() => setOptions({ breweries: [], styles: [], beers: [], capabilities: {} }))
    Promise.all([loadSeries(), loadStats()]).catch(() => undefined)
  }, [loadSeries, loadStats])

  const remember = (action) => {
    lastAction.current = action
    return action()
  }

  const create = (productId) => {
    const key = requestKey()
    return remember(async () => {
      const result = await run(() => createBrewDoneItGame(productId, key), () => 'Challenge created. Send the challenge details to the other player.')
      setGame(result.game)
      setRound(result.round)
      setInvitation({ gameId: result.game.id, code: result.invitationCode, expiresAt: result.game.expires_at })
      await loadSeries()
    })
  }

  const join = ({ gameId, inviteCode }) => {
    const key = requestKey()
    return remember(async () => {
      const result = await run(() => joinBrewDoneItGame(gameId, inviteCode.trim(), 0, key), () => 'Challenge accepted. Start narrowing the brewery and beer.')
      setGame(result.game)
      setRound(result.round)
      setInvitation(null)
      await Promise.all([loadSeries(), loadRoundWorkspace(result.round)])
    })
  }

  const saveDeduction = (deduction) => {
    const key = requestKey()
    return remember(async () => {
      await run(() => saveBrewDoneItDeduction(round.id, deduction, round.version || 0, key), () => 'Deduction saved.')
      const payload = await getBrewDoneItDeductions(round.id)
      setDeductions(Array.isArray(payload.deductions) ? payload.deductions : [])
    })
  }

  const submitOutcome = (guessType, referenceId) => {
    const key = requestKey()
    return remember(async () => {
      const result = await run(
        () => submitBrewDoneItOutcome(round.id, guessType, referenceId, round.version || 0, key),
        (value) => value.guess?.is_correct ? `${guessType === 'beer' ? 'Exact beer' : guessType} correct.` : `${guessType === 'beer' ? 'Beer' : guessType} guess incorrect.`
      )
      setRound((current) => mergeProjectedRoundGuess(current, result.round, result.guess))
      await loadSeries()
    })
  }

  const completeRound = () => {
    const key = requestKey()
    return remember(async () => {
      const result = await run(() => completeBrewDoneItRound(round.id, round.version || 0, key), (value) => `Round complete: ${value.round.awarded_points || 0} points.`)
      setRound(result.round)
      await Promise.all([loadRevealedProduct(result.round), loadSeries(), loadStats()])
    })
  }

  const updateHistorySharing = (enabled) => {
    const key = requestKey()
    return remember(async () => {
      const result = await run(() => setBrewDoneItHistorySharing(game.id, enabled, game.version || 0, key), () => enabled ? 'Rating-history clues enabled.' : 'Rating-history clues disabled.')
      setGame(result.game)
      await loadSeries()
    })
  }

  const startNextRound = (productId) => {
    const key = requestKey()
    return remember(async () => {
      const result = await run(() => createBrewDoneItRound(game.id, productId, game.version || 0, key), () => 'Next round created. Your opponent can start narrowing the new beer.')
      setGame(result.game)
      setRound(result.round)
      setRevealedProduct(null)
      await Promise.all([loadSeries(), loadRoundWorkspace(result.round)])
    })
  }

  const forfeit = async () => {
    if (!window.confirm('Forfeit this round? It will end with zero points for the guesser.')) return
    const key = requestKey()
    return remember(async () => {
      const result = await run(() => forfeitBrewDoneItRound(round.id, round.version || 0, key), () => 'Round forfeited. The series remains available for another round.')
      setRound(result.round)
      await Promise.all([loadRevealedProduct(result.round), loadSeries(), loadStats()])
    })
  }

  const returnToChallenges = async () => {
    setGame(null)
    setRound(null)
    setInvitation(null)
    setRevealedProduct(null)
    setDeductions([])
    setSelectorClues(null)
    setError('')
    await loadSeries().catch(() => undefined)
  }

  const historySharing = game && user ? (
    String(game.creator_participant_id) === String(user.id)
      ? game.creator_history_clues_enabled === true
      : game.opponent_history_clues_enabled === true
  ) : false
  const canStartNextRound = game?.status === 'active' && terminalRound(round) && role === 'guesser'
  const waitingInvitationExpired = game?.status === 'waiting' && isBrewDoneItInvitationExpired(game.expires_at)

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Persistent two-player deduction game</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900">Brew Done It</h1>
        <p className="mt-2 max-w-3xl text-gray-600">Work out the brewery and exact beer. When the exact beer is not practical to identify, the style is the fallback. Ask natural yes/no questions and use Pourfolio as your persistent deduction board.</p>
      </header>

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
      {error && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-950">
          <p>{error}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" className="rounded-md bg-red-800 px-3 py-2 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2" onClick={() => lastAction.current?.()}>Retry action</button>
            {game && <button type="button" className="rounded-md border border-red-800 px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2" onClick={refresh}>Refresh series</button>}
            <button type="button" className="rounded-md px-3 py-2 underline focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2" onClick={returnToChallenges}>Return to challenges</button>
          </div>
        </div>
      )}

      {!game && (
        <>
          <BrewDoneItSeriesList series={series} userId={user?.id} busy={busy} onOpen={openSeries} />
          <BrewDoneItInvite invitation={invitation} busy={busy} initialProductId={initialProductId} onCreate={create} onJoin={join} />
        </>
      )}
      {game && <button type="button" className="underline focus:outline-none focus:ring-2 focus:ring-amber-500" disabled={busy} onClick={returnToChallenges}>All challenges</button>}

      {game?.status === 'waiting' && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-6" aria-labelledby="brew-waiting-heading">
          <h2 id="brew-waiting-heading" className="text-xl font-semibold text-amber-950">{waitingInvitationExpired ? 'Challenge invitation expired' : 'Challenge waiting for another player'}</h2>
          <p className="mt-2 text-amber-950">Series {game.id} {waitingInvitationExpired ? 'can no longer be joined with this invitation.' : 'is waiting to be accepted.'} Your selected beer remains hidden.</p>
          <BrewDoneItInvitationExpiry expiresAt={game.expires_at} />
          {invitation && <div className="mt-3"><p className="break-all font-mono text-sm">Game {invitation.gameId}: {invitation.code}</p><BrewDoneItInvitationShare gameId={invitation.gameId} inviteCode={invitation.code} disabled={busy || waitingInvitationExpired} /></div>}
          <button type="button" className="mt-4 underline focus:outline-none focus:ring-2 focus:ring-amber-500" disabled={busy} onClick={refresh}>Refresh challenge</button>
        </section>
      )}

      {game?.status === 'active' && round && !terminalRound(round) && (
        <BrewDoneItRound game={game} round={round} role={role} busy={busy} options={options} onRefresh={refresh} onForfeit={forfeit}>
          {role === 'selector'
            ? <BrewDoneItSelectorSheet clues={selectorClues} loading={cluesLoading} />
            : <BrewDoneItDeductionBoard round={round} options={options} deductions={deductions} busy={busy} historySharing={historySharing} onHistorySharing={updateHistorySharing} onSaveDeduction={saveDeduction} onOutcome={submitOutcome} onComplete={completeRound} />}
        </BrewDoneItRound>
      )}

      {terminalRound(round) && (
        <>
          <BrewDoneItScore round={round} selectedProduct={revealedProduct} />
          {canStartNextRound ? (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"><BrewDoneItSelection busy={busy} onSelect={startNextRound} /></section>
          ) : game?.status === 'active' ? (
            <div role="status" className="rounded-lg bg-blue-50 p-4 text-blue-950">The other player chooses the beer for the next round. Refresh after they create it.</div>
          ) : null}
        </>
      )}
      <BrewDoneItStatistics stats={stats} />
    </div>
  )
}
