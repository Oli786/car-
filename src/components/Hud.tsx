import { Gauge, Pause, Play, Route, Shield, Trophy, Volume2, VolumeX } from 'lucide-react'
import { ArcCoinIcon } from './ArcMark'
import { MAX_SHIELDS } from '@/game/constants'
import type { GameStatus, Hud as HudState } from '@/game/types'

interface Props {
  hud: HudState
  high: number
  status: GameStatus
  soundOn: boolean
  onTogglePause: () => void
  onToggleSound: () => void
}

const iconBtn =
  'grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-100 transition hover:border-cyan-300/50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40'
const chip = 'flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 text-xs font-medium tabular-nums text-slate-100'

/** Score bar that sits above the racing area, so nothing is ever drawn on top of the road. */
export function Hud({ hud, high, status, soundOn, onTogglePause, onToggleSound }: Props) {
  const best = Math.max(high, hud.score)
  const playing = status === 'running' || status === 'paused'
  return (
    <div className="shrink-0 space-y-2">
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-end gap-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-cyan-300/90">Score</p>
            <p className="font-display text-3xl font-bold leading-none tabular-nums text-white sm:text-4xl">{hud.score.toLocaleString()}</p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-yellow-300/90">
              <Trophy size={11} /> High score
            </p>
            <p className="font-display text-xl font-semibold leading-tight tabular-nums text-slate-100 sm:text-2xl">{best.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className={iconBtn} onClick={onToggleSound} aria-label={soundOn ? 'Mute sound' : 'Unmute sound'} title="Sound">
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button type="button" className={iconBtn} onClick={onTogglePause} disabled={!playing} aria-label={status === 'paused' ? 'Resume' : 'Pause'} title="Pause (P)">
            {status === 'paused' ? <Play size={18} /> : <Pause size={18} />}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={chip}>
          <ArcCoinIcon size={15} /> {hud.coins}
        </span>
        <span className={chip}>
          <Gauge size={13} className="text-cyan-300" /> {hud.speedKmh} km/h
        </span>
        <span className={chip}>
          <Route size={13} className="text-violet-300" /> {hud.distance.toLocaleString()} m
        </span>
        <span className={chip} aria-label={`${hud.shields} shields left`}>
          {Array.from({ length: MAX_SHIELDS }, (_, i) => (
            <Shield key={i} size={14} className={i < hud.shields ? 'fill-emerald-300/80 text-emerald-300' : 'text-slate-600'} />
          ))}
        </span>
        <span className="rounded-full bg-pink-500/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-pink-300">Lv {hud.level}</span>
      </div>
    </div>
  )
}
