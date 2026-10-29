import { H, LANES, MAX_SHIELDS, PX_PER_M, TRAFFIC_COLORS, laneCenter } from './constants'

/** Traffic, coins and pickups drift down at (1 - TRAFFIC_FACTOR) of the road scroll speed. */
export const TRAFFIC_FACTOR = 0.42
export const TRAFFIC_REL = 1 - TRAFFIC_FACTOR

export type HazardKind = 'car' | 'truck' | 'barrier'

export interface Hazard {
  kind: HazardKind
  x: number
  y: number
  w: number
  h: number
  /** Collision half extents. */
  hw: number
  hh: number
  color: string
}
export interface CoinItem {
  x: number
  y: number
  phase: number
}
export interface Pickup {
  x: number
  y: number
}
export interface Oil {
  x: number
  y: number
  w: number
  h: number
}
export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  color: string
}

export interface Pop {
  x: number
  y: number
  life: number
  max: number
  text: string
}

export interface World {
  pops: Pop[]
  hazards: Hazard[]
  coins: CoinItem[]
  pickups: Pickup[]
  oils: Oil[]
  particles: Particle[]
}

export const newWorld = (): World => ({ hazards: [], coins: [], pickups: [], oils: [], particles: [], pops: [] })

const SPAWN_Y = -170
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

/** Coins are rate-limited so a run can never out-collect the leaderboard contract's plausibility bound (3.5/s). */
const COIN_RATE = 3.3
const COIN_HEADSTART = 6

export class Spawner {
  private timer = 1.1
  private oilTimer = 7
  private safeLane = 1
  private coinsSpawned = 0
  private nextPickupAt = 22

  reset() {
    this.timer = 1.1
    this.oilTimer = 7
    this.safeLane = 1
    this.coinsSpawned = 0
    this.nextPickupAt = 22
  }

  /** `mult` is the effective speed multiplier so row spacing stays constant when braking or boosting. */
  update(dt: number, time: number, base: number, mult: number, shields: number, world: World) {
    const progress = Math.max(0.35, Math.min(mult, 1.3))
    this.timer -= dt * progress
    if (this.timer <= 0) {
      const interval = Math.max(0.9, 1.6 - 0.007 * time)
      this.spawnWave(time, base, interval, shields, world)
      this.timer = interval
    }
    this.oilTimer -= dt
    if (this.oilTimer <= 0) {
      const w = 54
      world.oils.push({ x: laneCenter(Math.floor(Math.random() * LANES)), y: -60, w, h: 70 })
      this.oilTimer = 8 + Math.random() * 6
    }
  }

  private spawnWave(time: number, base: number, interval: number, shields: number, world: World) {
    const prev = this.safeLane
    const next = Math.max(0, Math.min(LANES - 1, prev + pick([-1, 0, 0, 1])))
    this.safeLane = next

    const maxBlocked = Math.min(3, 1 + Math.floor(time / 40))
    const wantBlocked = 1 + Math.floor(Math.random() * maxBlocked)
    const candidates = [...Array(LANES).keys()].filter((l) => l !== next)
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    }
    for (const lane of candidates.slice(0, wantBlocked)) world.hazards.push(this.makeHazard(lane, time))

    // Pickups sit in the gap between the previous and this row, on a path from the old safe lane to the new one.
    const gapPx = interval * TRAFFIC_REL * PX_PER_M * base
    const midY = SPAWN_Y + gapPx * 0.5
    if (time >= this.nextPickupAt && shields < MAX_SHIELDS) {
      world.pickups.push({ x: laneCenter(next), y: midY })
      this.nextPickupAt = time + 26 + Math.random() * 14
    } else if (Math.random() < 0.75 && this.coinsSpawned + 3 <= COIN_RATE * time + COIN_HEADSTART) {
      const x0 = laneCenter(prev)
      const x1 = laneCenter(next)
      for (let i = 0; i < 3; i++) {
        const f = i / 2
        world.coins.push({ x: x0 + (x1 - x0) * f, y: midY + 42 - i * 42, phase: Math.random() * 6 })
      }
      this.coinsSpawned += 3
    }
  }

  private makeHazard(lane: number, time: number): Hazard {
    const r = Math.random()
    const x = laneCenter(lane)
    if (time > 14 && r < 0.2) return { kind: 'barrier', x, y: SPAWN_Y, w: 66, h: 32, hw: 33, hh: 14, color: '#ffd23f' }
    if (time > 24 && r < 0.38) return { kind: 'truck', x, y: SPAWN_Y - 20, w: 50, h: 140, hw: 23, hh: 66, color: pick(TRAFFIC_COLORS) }
    return { kind: 'car', x, y: SPAWN_Y, w: 44, h: 84, hw: 19, hh: 38, color: pick(TRAFFIC_COLORS) }
  }
}

export function advanceWorld(world: World, scrollPx: number, dt: number) {
  const rel = scrollPx * dt * TRAFFIC_REL
  for (const h of world.hazards) h.y += rel
  for (const c of world.coins) c.y += rel
  for (const p of world.pickups) p.y += rel
  for (const o of world.oils) o.y += scrollPx * dt
  for (const p of world.pops) p.y += rel
  world.hazards = world.hazards.filter((h) => h.y < H + 160)
  world.coins = world.coins.filter((c) => c.y < H + 40)
  world.pickups = world.pickups.filter((p) => p.y < H + 40)
  world.oils = world.oils.filter((o) => o.y < H + 80)
}

export function burst(world: World, x: number, y: number, color: string, n: number, speed: number) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2
    const s = speed * (0.35 + Math.random() * 0.65)
    world.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 0.35 + Math.random() * 0.4, size: 1.5 + Math.random() * 2.5, color })
  }
}

export function addPop(world: World, x: number, y: number, text: string) {
  world.pops.push({ x, y, life: 0, max: 0.7, text })
}

export function stepParticles(world: World, dt: number) {
  for (const p of world.pops) p.life += dt
  world.pops = world.pops.filter((p) => p.life < p.max)
  for (const p of world.particles) {
    p.life += dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vx *= 1 - 2 * dt
    p.vy *= 1 - 2 * dt
  }
  world.particles = world.particles.filter((p) => p.life < p.max)
}
