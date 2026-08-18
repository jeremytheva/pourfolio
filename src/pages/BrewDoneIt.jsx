import React, { useCallback, useEffect, useRef, useState } from 'react'
import BrewDoneItGuess from '../components/BrewDoneItGuess.jsx'
import BrewDoneItInvite from '../components/BrewDoneItInvite.jsx'
import BrewDoneItQuestion from '../components/BrewDoneItQuestion.jsx'
import BrewDoneItRound from '../components/BrewDoneItRound.jsx'
import BrewDoneItScore from '../components/BrewDoneItScore.jsx'
import BrewDoneItSelection from '../components/BrewDoneItSelection.jsx'
import BrewDoneItStatistics from '../components/BrewDoneItStatistics.jsx'
import { beverageService } from '../services/beverageService.js'
import {
  askBrewDoneItHistoryQuestion, createBrewDoneItGame, getBrewDoneItGame, getBrewDoneItStats,
  joinBrewDoneItGame, selectBrewDoneItProduct, submitBrewDoneItGuess, transitionBrewDoneItGame
} from '../services/brewDoneItService.js'

const requestKey = () => `brew-done-it-${crypto.randomUUID()}`

export default function BrewDoneIt({ user }) {
  const [game, setGame] = useState(null)
  const [round, setRound] = useState(null)
  const [invitation, setInvitation] = useState(null)
  const [products, setProducts] = useState([])
  const [revealedProduct, setRevealedProduct] = useState(null)
  const [stats, setStats] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const lastAction = useRef(null)
  const role = String(game?.selector_participant_id) === String(user?.id) ? 'selector' : 'guesser'

  const run = useCallback(async (action, successMessage) => {
    setBusy(true); setError('')
    try {
      const result = await action()
      if (successMessage) setAnnouncement(successMessage(result))
      return result
    } catch (caught) {
      const expired = /expired/i.test(caught.message)
      const stale = caught.status === 409 && !expired
      setError(expired
        ? 'This invitation or round has expired. Start or join a new game.'
        : stale
          ? 'The round changed before your action was accepted. Refresh the round before trying again.'
          : caught.status === 0 ? 'The game service could not be reached. Check your connection and retry.'
            : 'That action could not be completed. Refresh the round or return to invitations.')
      throw caught
    } finally { setBusy(false) }
  }, [])

  const refresh = useCallback(async () => {
    if (!game?.id) return
    const result = await run(() => getBrewDoneItGame(game.id), () => 'Round updated.')
    setGame(result.game); setRound(result.rounds?.at(-1) || null)
  }, [game?.id, run])

  useEffect(() => { getBrewDoneItStats().then(setStats).catch(() => {}) }, [])
  useEffect(() => {
    if (round?.status === 'completed' && round.selected_product_id) {
      beverageService.getProduct(round.selected_product_id).then(setRevealedProduct).catch(() => {})
    }
  }, [round?.selected_product_id, round?.status])
  useEffect(() => {
    if (!round || round.status === 'completed') return
    if ((role === 'selector' && round.status === 'awaiting_selection') || (role === 'guesser' && round.status === 'guessing')) {
      beverageService.getProducts({ limit: 100 }).then((payload) => setProducts(payload.items || [])).catch(() => setError('Catalogue choices could not be loaded. Retry when your connection is available.'))
    } else setProducts([])
  }, [role, round?.id, round?.status])

  const remember = (action) => { lastAction.current = action; return action() }
  const create = (consent) => {
    const key = requestKey()
    return remember(async () => {
    const result = await run(() => createBrewDoneItGame(consent, key), () => 'Invitation created and ready to share.')
    setGame(result.game); setInvitation({ gameId: result.game.id, code: result.invitationCode })
    })
  }
  const join = ({ gameId, inviteCode, consent }) => {
    const key = requestKey()
    return remember(async () => {
    const result = await run(() => joinBrewDoneItGame(gameId, inviteCode.trim(), consent, 0, key), () => 'Invitation accepted. It is your opponent’s turn to select a beer.')
    setGame(result.game); setRound(result.round)
    })
  }
  const select = (productId) => {
    const key = requestKey()
    return remember(async () => {
    const result = await run(() => selectBrewDoneItProduct(round.id, productId, round.version || 0, key), () => 'Secret beer accepted. Your opponent can now begin guessing.')
    setRound(result.round); setProducts([])
    })
  }
  const ask = (predicate) => {
    const key = requestKey()
    return remember(async () => {
    const result = await run(() => askBrewDoneItHistoryQuestion(round.id, predicate, round.version || 0, key), (value) => `Answer accepted: ${value.answer ? 'yes' : 'no'}.`)
    setRound((current) => ({ ...current, version: result.version, question_count: Number(current.question_count || 0) + 1 }))
    })
  }
  const guess = (type, id) => {
    const key = requestKey()
    return remember(async () => {
    const result = await run(() => submitBrewDoneItGuess(round.id, type, id, round.version || 0, key), (value) => value.round.status === 'completed' ? `Guess accepted. ${value.round.awarded_points || 0} points awarded. Round complete.` : `${value.guess.awarded_points || 0} points awarded. Continue the round.`)
    setRound(result.round)
    if (result.round.status === 'completed') getBrewDoneItStats().then(setStats).catch(() => {})
    })
  }
  const forfeit = async () => {
    if (!window.confirm('Forfeit this game? This action cannot be undone.')) return
    const result = await run(() => transitionBrewDoneItGame(game.id, 'forfeit', game.version || 0, requestKey()), () => 'Round complete. The game was forfeited.')
    setGame(result.game); setRound((current) => ({ ...current, status: 'forfeited' }))
  }

  const terminal = ['completed', 'expired', 'cancelled', 'forfeited'].includes(game?.status) || ['completed', 'expired', 'cancelled', 'forfeited'].includes(round?.status)

  return <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
    <header><p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Protected two-player game</p><h1 className="mt-1 text-3xl font-bold text-gray-900">Brew Done It</h1><p className="mt-2 max-w-2xl text-gray-600">Invite another signed-in player, choose a secret beer and test their catalogue knowledge.</p></header>
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
    {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-950"><p>{error}</p><div className="mt-3 flex gap-3"><button type="button" className="rounded-md bg-red-800 px-3 py-2 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2" onClick={() => lastAction.current?.()}>Retry action</button>{game && <button type="button" className="rounded-md border border-red-800 px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-red-600" onClick={refresh}>Refresh round</button>}<button type="button" className="rounded-md px-3 py-2 underline focus:outline-none focus:ring-2 focus:ring-red-600" onClick={() => { setGame(null); setRound(null); setInvitation(null); setError('') }}>Return to invitations</button></div></div>}
    {!game && <BrewDoneItInvite invitation={invitation} busy={busy} onCreate={create} onJoin={join} />}
    {game?.status === 'waiting' && <BrewDoneItInvite invitation={invitation} busy={busy} onCreate={create} onJoin={join} />}
    {game && round && !terminal && <BrewDoneItRound game={game} round={round} role={role} busy={busy} onRefresh={refresh} onForfeit={forfeit}>
      {role === 'selector' && round.status === 'awaiting_selection' && <BrewDoneItSelection products={products} busy={busy} onSelect={select} />}
      {role === 'selector' && round.status === 'guessing' && <p role="status" className="rounded-lg bg-blue-50 p-4 text-blue-950">Waiting for your opponent. Refresh to check for their next turn.</p>}
      {role === 'guesser' && round.status === 'awaiting_selection' && <p role="status" className="rounded-lg bg-blue-50 p-4 text-blue-950">Your opponent is choosing a secret beer. Refresh when they are ready.</p>}
      {role === 'guesser' && round.status === 'guessing' && <><BrewDoneItQuestion busy={busy} onAsk={ask} /><BrewDoneItGuess products={products} busy={busy} onGuess={guess} /></>}
    </BrewDoneItRound>}
    {terminal && round?.status === 'completed' && <BrewDoneItScore round={round} selectedProduct={revealedProduct} />}
    {game?.status === 'expired' && <div role="alert" className="rounded-lg bg-amber-50 p-5"><h2 className="font-semibold">Invitation expired</h2><button className="mt-2 underline focus:outline-none focus:ring-2 focus:ring-amber-500" onClick={() => { setGame(null); setRound(null) }}>Start again</button></div>}
    {game?.status === 'active' && !round && <div role="status" className="rounded-lg bg-blue-50 p-5"><h2 className="font-semibold">Waiting for your opponent</h2><p className="mt-1">They may have disconnected. Refresh the game, or cancel and create a new invitation.</p><button className="mt-2 underline focus:outline-none focus:ring-2 focus:ring-blue-500" onClick={refresh}>Refresh game</button></div>}
    <BrewDoneItStatistics stats={stats} />
  </div>
}