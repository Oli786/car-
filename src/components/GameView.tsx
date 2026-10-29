import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { RacerEngine, readHighScore, readSoundPref } from '@/game/engine'
import { H, W } from '@/game/constants'
import type { GameStatus, Hud as HudState, InputState, RunResult } from '@/game/types'
import { Hud } from './Hud'
import { GameOverOverlay, PauseOverlay, StartOverlay } from './Overlays'
import { TouchControls } from './TouchControls'

const EMPTY_HUD: HudState = { score: 0, distance: 0, coins: 0, speedKmh: 0, shields: 3, level: 1 }

const KEYS: Record<string, keyof InputState> = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'boost', KeyW: 'boost', ArrowDown: 'brake', KeyS: 'brake',
}

function useTouchUi() {
  const [touch, setTouch] = useState(() => window.matchMedia('(pointer: coarse)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const on = () => setTouch(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return touch
}

/** Largest 420:760 box that fits inside the stage element. */
function useFit(stage: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      const fit = Math.min(w, (h * W) / H)
      setSize({ w: Math.max(0, Math.floor(fit)), h: Math.max(0, Math.floor((fit * H) / W)) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [stage])
  return size
}

interface Props {
  onStatus: (status: GameStatus) => void
  onGameOver: (result: RunResult) => void
  result: RunResult | null
  gameOverSlot: ReactNode
}

export function GameView({ onStatus, onGameOver, result, gameOverSlot }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const size = useFit(stageRef)
  const engineRef = useRef<RacerEngine | null>(null)
  const handlers = useRef({ onStatus, onGameOver })
  useEffect(() => {
    handlers.current = { onStatus, onGameOver }
  })

  const [status, setStatus] = useState<GameStatus>('idle')
  const [hud, setHud] = useState<HudState>(EMPTY_HUD)
  const [high, setHigh] = useState(readHighScore)
  const [soundOn, setSoundOn] = useState(readSoundPref)
  const touch = useTouchUi()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const engine = new RacerEngine(canvas, {
      onHud: setHud,
      onStatus: (s) => {
        setStatus(s)
        handlers.current.onStatus(s)
      },
      onGameOver: (r) => {
        setHigh(readHighScore())
        handlers.current.onGameOver(r)
      },
    })
    engineRef.current = engine
    return () => {
      engine.destroy()
      engineRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    setHud(EMPTY_HUD)
    window.focus()
    engineRef.current?.start()
  }, [])
  const togglePause = useCallback(() => engineRef.current?.togglePause(), [])
  const setInput = useCallback((p: Partial<InputState>) => engineRef.current?.setInput(p), [])
  const toggleSound = useCallback(() => {
    const e = engineRef.current
    if (!e) return
    e.setSound(!e.soundOn)
    setSoundOn(e.soundOn)
  }, [])

  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)
    const down = (e: KeyboardEvent) => {
      if (typing(e.target)) return
      const engine = engineRef.current
      if (!engine) return
      const k = KEYS[e.code]
      if (k) {
        e.preventDefault()
        engine.setInput({ [k]: true })
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (!e.repeat) engine.togglePause()
      } else if (e.code === 'Space' || e.code === 'Enter') {
        if (engine.status === 'idle' || engine.status === 'over') {
          if (e.target instanceof HTMLButtonElement) return
          e.preventDefault()
          start()
        } else if (engine.status === 'paused' && !(e.target instanceof HTMLButtonElement)) {
          e.preventDefault()
          engine.resume()
        }
      }
    }
    const up = (e: KeyboardEvent) => {
      const k = KEYS[e.code]
      if (k) engineRef.current?.setInput({ [k]: false })
    }
    const autoPause = () => {
      if (document.hidden) engineRef.current?.pause()
    }
    const blur = () => {
      engineRef.current?.pause()
      engineRef.current?.clearInput()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    document.addEventListener('visibilitychange', autoPause)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', autoPause)
    }
  }, [start])

  return (
    <section className="flex h-full min-h-0 flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-3 shadow-[0_0_60px_rgba(34,230,255,0.08)] sm:p-4">
      <Hud hud={hud} high={high} status={status} soundOn={soundOn} onTogglePause={togglePause} onToggleSound={toggleSound} />
      <div ref={stageRef} className="relative min-h-[360px] flex-1 overflow-hidden rounded-2xl border border-white/5 bg-[#05060f]">
        <div
          className="touch-none-select absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-white/10 shadow-[0_0_40px_rgba(255,46,147,0.12)]"
          style={{ width: size.w, height: size.h }}
        >
          <canvas ref={canvasRef} width={W} height={H} className="block h-full w-full" aria-label="Arc Racer game canvas" />
        </div>
        {status === 'running' && touch && <TouchControls onInput={setInput} />}
        {status === 'idle' && <StartOverlay high={high} onStart={start} />}
        {status === 'paused' && <PauseOverlay onResume={() => engineRef.current?.resume()} onRestart={start} />}
        {status === 'over' && result && (
          <GameOverOverlay result={result} high={high} onRestart={start}>
            {gameOverSlot}
          </GameOverOverlay>
        )}
      </div>
    </section>
  )
}
