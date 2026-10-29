/**
 * Headless simulation of the Arc Racer engine (no browser needed).
 * Run: bun run scripts/sim-game.ts
 * Checks that bot-driven and degenerate runs end in a valid game over, that every result
 * fits the leaderboard contract's plausibility bounds, and prints how survivable the game is.
 */
import type { RunResult } from '../src/game/types'

const store = new Map<string, string>()
let pending: ((t: number) => void) | null = null
const g = globalThis as unknown as Record<string, unknown>
g.window = globalThis
g.devicePixelRatio = 1
g.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
}
g.requestAnimationFrame = (cb: (t: number) => void) => {
  pending = cb
  return 1
}
g.cancelAnimationFrame = () => {
  pending = null
}

const props = new Map<string | symbol, unknown>([['globalAlpha', 1]])
const sink: unknown = new Proxy(function () {}, {
  get: (_t, p) => (p === 'then' ? undefined : props.has(p) ? props.get(p) : sink),
  apply: () => sink,
  set: (_t, p, v) => {
    props.set(p, v)
    return true
  },
})
const canvas = { width: 0, height: 0, getContext: () => sink } as unknown as HTMLCanvasElement

const { RacerEngine } = await import('../src/game/engine')
const { PLAYER_Y, laneCenter, LANES } = await import('../src/game/constants')

interface Internals {
  world: { hazards: { x: number; y: number; hw: number; hh: number }[]; coins: { x: number; y: number }[] }
  px: number
  time: number
  shields: number
}

const maxDistanceFor = (d: number) => {
  const raw = d <= 148 ? 34 * d + (9 * d * d) / 50 : 34 * 148 + (9 * 148 * 148) / 50 + 87 * (d - 148)
  return Math.floor((raw * 105) / 100)
}
const maxCoinsFor = (d: number) => Math.floor((7 * d + 1) / 2) + 5

type Policy = 'bot' | 'boost-idle' | 'idle'

function run(policy: Policy, maxSeconds: number) {
  let result: RunResult | null = null
  const engine = new RacerEngine(canvas, { onHud: () => {}, onStatus: () => {}, onGameOver: (r) => (result = r) })
  const s = engine as unknown as Internals
  engine.start()
  let now = 0
  let hits = 0
  let lastShields = s.shields
  for (let i = 0; i < maxSeconds * 60 && !result; i++) {
    if (policy === 'bot') {
      let best = 1
      let bestScore = -Infinity
      for (let lane = 0; lane < LANES; lane++) {
        const cx = laneCenter(lane)
        let clearance = 600
        for (const h of s.world.hazards) {
          if (Math.abs(h.x - cx) < 40 + h.hw - 6 && h.y > PLAYER_Y - 420 && h.y < PLAYER_Y + 90) clearance = Math.min(clearance, Math.max(0, PLAYER_Y - h.y - h.hh))
        }
        let coins = 0
        for (const c of s.world.coins) if (Math.abs(c.x - cx) < 30 && c.y < PLAYER_Y && c.y > PLAYER_Y - 300) coins++
        const score = clearance + coins * 12 - Math.abs(cx - s.px) * 0.8
        if (score > bestScore) {
          bestScore = score
          best = lane
        }
      }
      const dx = laneCenter(best) - s.px
      engine.setInput({ left: dx < -5, right: dx > 5 })
    } else if (policy === 'boost-idle') {
      engine.setInput({ boost: true })
    }
    now += 1000 / 60
    pending?.(now)
    if (s.shields < lastShields) hits += lastShields - s.shields
    lastShields = s.shields
  }
  engine.destroy()
  return { result: result as RunResult | null, hits, time: s.time }
}

let failures = 0
const check = (ok: boolean, msg: string) => {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`)
}

// 1) Idle car must crash out and produce a valid game over.
const idle = run('idle', 120)
check(idle.result !== null, `idle car reaches game over (${idle.time.toFixed(1)}s, score ${idle.result?.score})`)

// 2) Boost held the whole run (worst case for the distance bound) must stay inside the contract bound.
const boosted = run('boost-idle', 300)
if (boosted.result) {
  const r = boosted.result
  check(r.distance <= maxDistanceFor(r.duration), `boost-only run distance ${r.distance} <= contract bound ${maxDistanceFor(r.duration)} (duration ${r.duration}s)`)
} else check(false, 'boost-only run ended')

// 3) Bot runs: survivability plus bound checks on every result.
const times: number[] = []
let boundOk = true
for (let i = 0; i < 12; i++) {
  const b = run('bot', 240)
  const r = b.result
  times.push(b.time)
  if (r) {
    if (r.distance > maxDistanceFor(r.duration) || r.coins > maxCoinsFor(r.duration) || r.score !== r.distance + r.coins * 20) boundOk = false
  }
  console.log(`  bot #${i + 1}: survived ${b.time.toFixed(0)}s, hits ${b.hits}, ${r ? `score ${r.score} (${r.distance} m, ${r.coins} coins)` : 'still alive at cap'}`)
}
check(boundOk, 'every bot result fits the contract distance, coin and score rules')
const avg = times.reduce((a, b) => a + b, 0) / times.length
check(avg > 60, `a simple bot survives a long time on average (${avg.toFixed(0)}s), so the track is beatable`)
check(avg < 239, 'difficulty eventually ends runs (not endless safety)')

console.log(failures === 0 ? '\nAll simulation checks passed.' : `\n${failures} simulation check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
