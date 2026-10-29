import { useState } from 'react'
import { GameView } from '@/components/GameView'
import { Leaderboard } from '@/components/Leaderboard'
import { SubmitScore } from '@/components/SubmitScore'
import { WalletCard } from '@/components/WalletCard'
import type { GameStatus, RunResult } from '@/game/types'

const KEYS: [string, string][] = [
  ['A D / Arrows', 'Steer'],
  ['W', 'Boost'],
  ['S', 'Brake'],
  ['P', 'Pause'],
]

function Header() {
  return (
    <header className="mx-auto w-full max-w-6xl shrink-0 px-4 pb-3 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold leading-none tracking-tight text-white sm:text-3xl">
            ARC <span className="text-pink-400">RACER</span>
          </h1>
          <p className="mt-1 text-pretty text-sm text-slate-400">Dodge traffic, grab coins, and post your best run to Arc Testnet.</p>
        </div>
        <ul className="flex flex-wrap items-center gap-2" aria-label="Controls">
          {KEYS.map(([key, action]) => (
            <li key={action} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1.5 pr-3 text-xs text-slate-300">
              <kbd className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-1.5 py-0.5 font-mono text-[11px] font-medium text-cyan-200">{key}</kbd>
              {action}
            </li>
          ))}
          <li className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">Touch: use the on-screen buttons</li>
        </ul>
      </div>
    </header>
  )
}

export default function App() {
  const [result, setResult] = useState<RunResult | null>(null)
  const [runId, setRunId] = useState(0)

  const onStatus = (s: GameStatus) => {
    if (s === 'running') setResult(null)
  }
  const onGameOver = (r: RunResult) => {
    setResult(r)
    setRunId((n) => n + 1)
  }

  return (
    <div className="grid-bg flex min-h-dvh flex-col lg:h-dvh lg:min-h-[680px]">
      <Header />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-4 px-4 pb-20 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-4">
        <div className="h-[calc(100dvh-9rem)] min-h-[560px] lg:h-full lg:min-h-0">
          <GameView
            onStatus={onStatus}
            onGameOver={onGameOver}
            result={result}
            gameOverSlot={result ? <SubmitScore key={runId} result={result} /> : null}
          />
        </div>
        <aside className="space-y-4 lg:min-h-0 lg:overflow-y-auto lg:pb-2" aria-label="Arc Testnet leaderboard and wallet">
          <WalletCard />
          <Leaderboard />
          <p className="text-pretty px-1 text-xs text-slate-500">
            Testnet only, no wagers or rewards. The contract checks scores for plausibility, which deters casual cheating but cannot prove a race happened.
          </p>
        </aside>
      </main>
    </div>
  )
}
