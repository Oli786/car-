import { Play, RotateCcw, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'
import type { RunResult } from '@/game/types'

const primary =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 to-sky-400 px-7 font-display text-base font-bold text-[#04121c] shadow-[0_0_28px_rgba(34,230,255,0.45)] ring-2 ring-white/20 transition hover:brightness-110 active:scale-95'

/** Covers the stage (not the canvas), scrolls if the stage is short, and centres its content. */
const shell = 'absolute inset-0 z-20 flex overflow-y-auto bg-[#04050d]/80 p-4 backdrop-blur-sm'
const panel = 'm-auto w-full max-w-[18rem] text-center'

export function StartOverlay({ high, onStart }: { high: number; onStart: () => void }) {
  return (
    <div className={shell}>
      <div className={`${panel} space-y-4`}>
        <h2 className="font-display text-4xl font-bold leading-none text-white">
          Ready to <span className="text-pink-400">race</span>?
        </h2>
        <p className="text-pretty text-sm text-slate-300">Dodge traffic, collect coins and chase a spot on the leaderboard.</p>
        <button type="button" onClick={onStart} className={primary}>
          <Play size={18} className="fill-current" /> Start Game
        </button>
        <p className="flex items-center justify-center gap-2 text-sm text-slate-400">
          <Trophy size={15} className="text-yellow-300" /> High score
          <span className="font-semibold tabular-nums text-white">{high.toLocaleString()}</span>
        </p>
        <p className="text-xs text-slate-500">or press Space / Enter</p>
      </div>
    </div>
  )
}

export function PauseOverlay({ onResume, onRestart }: { onResume: () => void; onRestart: () => void }) {
  return (
    <div className={shell}>
      <div className={`${panel} space-y-3`}>
        <h2 className="font-display text-4xl font-bold text-white">Paused</h2>
        <button type="button" onClick={onResume} className={primary}>
          <Play size={18} className="fill-current" /> Resume
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-white/15 text-sm font-semibold text-slate-100 transition hover:bg-white/5"
        >
          <RotateCcw size={16} /> Restart
        </button>
        <p className="text-xs text-slate-500">Press P to resume</p>
      </div>
    </div>
  )
}

export function GameOverOverlay({ result, high, onRestart, children }: { result: RunResult; high: number; onRestart: () => void; children?: ReactNode }) {
  return (
    <div className={shell}>
      <div className={`${panel} space-y-3`}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-pink-300">Game over</p>
          <p className="font-display text-5xl font-bold leading-none tabular-nums text-white">{result.score.toLocaleString()}</p>
          {result.isNewHigh ? (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-yellow-300/15 px-3 py-1 text-xs font-semibold text-yellow-300">
              <Trophy size={13} /> New high score
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-400">High score {high.toLocaleString()}</p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Distance', `${result.distance.toLocaleString()} m`],
            ['Coins', String(result.coins)],
            ['Time', `${result.duration}s`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white/5 px-1 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{k}</p>
              <p className="text-sm font-semibold tabular-nums text-white">{v}</p>
            </div>
          ))}
        </div>
        {children}
        <button type="button" onClick={onRestart} className={primary}>
          <RotateCcw size={17} /> Race Again
        </button>
      </div>
    </div>
  )
}
