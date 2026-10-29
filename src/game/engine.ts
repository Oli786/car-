import { SoundFx } from './audio'
import {
  BASE_ACCEL, BASE_MAX, BASE_START, BOOST_MULT, BRAKE_MULT, CAR_H, CAR_W, H, HIGH_SCORE_KEY, INVULN_SECONDS, MAX_SHIELDS,
  NEON, PLAYER_Y, PX_PER_M, ROAD_W, ROAD_X, SCORE_PER_COIN, SOUND_KEY, STEER_ACCEL, STEER_DRAG, STEER_MAX, W,
} from './constants'
import {
  drawBackdrop, drawHazard, drawOil, drawParticles, drawPickup, drawPops, drawShieldBubble, drawVignette,
} from './draw'
import { drawArcCoin, drawPlayerCar } from './sprites'
import type { EngineCallbacks, GameStatus, Hud, InputState, RunResult } from './types'
import { Spawner, addPop, advanceWorld, burst, newWorld, stepParticles } from './world'

const COUNTDOWN = 3
const DYING = 0.9
const baseSpeed = (t: number) => Math.min(BASE_START + BASE_ACCEL * t, BASE_MAX)

export const readHighScore = () => Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0
export const readSoundPref = () => localStorage.getItem(SOUND_KEY) !== 'off'

export class RacerEngine {
  status: GameStatus = 'idle'
  private ctx: CanvasRenderingContext2D
  private fx = new SoundFx()
  private raf = 0
  private last = 0
  private input: InputState = { left: false, right: false, boost: false, brake: false }
  private world = newWorld()
  private spawner = new Spawner()
  private high = readHighScore()
  private hudTimer = 0
  private tickShown = 0

  private time = 0
  private distance = 0
  private coins = 0
  private shields = MAX_SHIELDS
  private invuln = 0
  private px = W / 2
  private vx = 0
  private speedMult = 1
  private crash = 0
  private oil = 0
  private shake = 0
  private dying = 0
  private countdown = 0
  private roadOffset = 0
  private speedNow = 0

  constructor(private canvas: HTMLCanvasElement, private cb: EngineCallbacks) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D is not available')
    this.ctx = ctx
    this.fx.enabled = readSoundPref()
    this.resize()
    this.raf = requestAnimationFrame(this.frame)
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(W * dpr)
    this.canvas.height = Math.round(H * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  get soundOn() {
    return this.fx.enabled
  }

  setSound(on: boolean) {
    this.fx.ensure()
    this.fx.setEnabled(on)
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off')
  }

  setInput(patch: Partial<InputState>) {
    Object.assign(this.input, patch)
  }

  clearInput() {
    this.input = { left: false, right: false, boost: false, brake: false }
  }

  start() {
    this.fx.ensure()
    this.fx.setEnabled(this.fx.enabled)
    this.world = newWorld()
    this.spawner.reset()
    this.time = 0
    this.distance = 0
    this.coins = 0
    this.shields = MAX_SHIELDS
    this.invuln = 0
    this.px = W / 2
    this.vx = 0
    this.speedMult = 1
    this.crash = 0
    this.oil = 0
    this.shake = 0
    this.dying = 0
    this.countdown = COUNTDOWN
    this.tickShown = 0
    this.high = readHighScore()
    this.setStatus('running')
    this.fx.startEngine()
    this.emitHud()
  }

  pause() {
    if (this.status !== 'running' || this.dying > 0) return
    this.fx.stopEngine()
    this.clearInput()
    this.setStatus('paused')
  }

  resume() {
    if (this.status !== 'paused') return
    this.fx.ensure()
    this.fx.startEngine()
    this.last = performance.now()
    this.setStatus('running')
  }

  togglePause() {
    if (this.status === 'running') this.pause()
    else if (this.status === 'paused') this.resume()
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.fx.stopEngine()
  }

  private setStatus(s: GameStatus) {
    this.status = s
    this.cb.onStatus(s)
  }

  private frame = (now: number) => {
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000))
    this.last = now
    if (this.status === 'running') this.step(dt)
    else if (this.status === 'idle') {
      this.roadOffset += 240 * dt
      this.speedNow = 0.25
    }
    stepParticles(this.world, dt)
    this.render(now / 1000)
    this.raf = requestAnimationFrame(this.frame)
  }

  private step(dt: number) {
    if (this.countdown > 0) {
      this.countdown -= dt
      this.roadOffset += 200 * dt
      this.speedNow = 0.2
      const shown = Math.ceil(this.countdown)
      if (shown !== this.tickShown && shown > 0) {
        this.tickShown = shown
        this.fx.tick()
      }
      this.steer(dt, 0)
      return
    }

    const dying = this.dying > 0
    if (dying) {
      this.dying -= dt
      if (this.dying <= 0) return this.finish()
    } else {
      this.time += dt
    }

    const base = baseSpeed(this.time)
    const target = this.input.boost ? BOOST_MULT : this.input.brake ? BRAKE_MULT : 1
    this.speedMult += (target - this.speedMult) * Math.min(1, 3 * dt)
    this.crash = Math.max(0, this.crash - dt / 1.2)
    const dyingScale = dying ? Math.max(0, this.dying / DYING) : 1
    const mult = this.speedMult * (1 - 0.5 * this.crash)
    const v = base * mult * dyingScale
    const scroll = v * PX_PER_M
    this.speedNow = Math.min(1, v / (BASE_MAX * BOOST_MULT))
    this.distance += v * dt
    this.roadOffset += scroll * dt
    this.fx.setEngine(this.speedNow)

    this.steer(dt, dying ? 0 : 1)
    if (!dying) this.spawner.update(dt, this.time, base, mult, this.shields, this.world)
    advanceWorld(this.world, scroll, dt)
    if (!dying) this.collide()

    this.invuln = Math.max(0, this.invuln - dt)
    this.oil = Math.max(0, this.oil - dt)
    this.shake = Math.max(0, this.shake - dt * 2.2)
    if (this.speedNow > 0.5 && Math.random() < 0.5) {
      this.world.particles.push({ x: this.px + (Math.random() - 0.5) * 18, y: PLAYER_Y + CAR_H / 2, vx: (Math.random() - 0.5) * 30, vy: 90 + Math.random() * 120, life: 0, max: 0.3, size: 2, color: this.input.boost ? '#9fd8ff' : '#2f8bff' })
    }

    this.hudTimer -= dt
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.08
      this.emitHud()
    }
  }

  private steer(dt: number, enabled: number) {
    const dir = ((this.input.right ? 1 : 0) - (this.input.left ? 1 : 0)) * enabled
    const slip = this.oil > 0
    let ax = dir * STEER_ACCEL
    if (slip) ax += Math.sin(this.time * 16) * 1100
    this.vx += ax * dt
    this.vx -= this.vx * Math.min(1, (slip ? 2.4 : STEER_DRAG) * dt)
    this.vx = Math.max(-STEER_MAX, Math.min(STEER_MAX, this.vx))
    this.px += this.vx * dt
    const min = ROAD_X + CAR_W / 2 + 3
    const max = ROAD_X + ROAD_W - CAR_W / 2 - 3
    if (this.px < min || this.px > max) {
      this.px = Math.max(min, Math.min(max, this.px))
      this.vx = 0
    }
  }

  private collide() {
    const pw = 17
    const ph = 37
    const w = this.world
    for (const o of w.oils) {
      if (Math.abs(o.x - this.px) < o.w / 2 + pw - 6 && Math.abs(o.y - PLAYER_Y) < o.h / 2 + ph - 10 && this.oil < 0.3) this.oil = 1.3
    }
    for (let i = w.coins.length - 1; i >= 0; i--) {
      const c = w.coins[i]
      if (Math.abs(c.x - this.px) < pw + 12 && Math.abs(c.y - PLAYER_Y) < ph + 12) {
        w.coins.splice(i, 1)
        this.coins++
        burst(w, c.x, c.y, NEON.cyan, 9, 180)
        burst(w, c.x, c.y, '#ffffff', 4, 120)
        addPop(w, c.x, c.y, `+${SCORE_PER_COIN}`)
        this.fx.coin()
      }
    }
    for (let i = w.pickups.length - 1; i >= 0; i--) {
      const p = w.pickups[i]
      if (Math.abs(p.x - this.px) < pw + 16 && Math.abs(p.y - PLAYER_Y) < ph + 16) {
        w.pickups.splice(i, 1)
        if (this.shields < MAX_SHIELDS) this.shields++
        burst(w, p.x, p.y, NEON.green, 14, 200)
        this.fx.shield()
      }
    }
    if (this.invuln > 0) return
    for (let i = w.hazards.length - 1; i >= 0; i--) {
      const h = w.hazards[i]
      if (Math.abs(h.x - this.px) < h.hw + pw && Math.abs(h.y - PLAYER_Y) < h.hh + ph) {
        w.hazards.splice(i, 1)
        this.hit(h.x, h.y)
        return
      }
    }
  }

  private hit(x: number, y: number) {
    this.shields--
    this.shake = 1
    this.crash = 1
    burst(this.world, x, y, NEON.pink, 22, 320)
    burst(this.world, this.px, PLAYER_Y, '#ffffff', 10, 240)
    this.fx.crash()
    if (this.shields <= 0) {
      this.dying = DYING
      this.fx.stopEngine()
    } else {
      this.invuln = INVULN_SECONDS
    }
    this.emitHud()
  }

  private finish() {
    const distance = Math.floor(this.distance)
    const score = distance + this.coins * SCORE_PER_COIN
    const isNewHigh = score > this.high
    if (isNewHigh) {
      this.high = score
      localStorage.setItem(HIGH_SCORE_KEY, String(score))
    }
    const result: RunResult = { score, distance, coins: this.coins, duration: Math.max(1, Math.ceil(this.time)), isNewHigh }
    this.fx.gameOver()
    this.clearInput()
    this.setStatus('over')
    this.cb.onGameOver(result)
  }

  private emitHud() {
    const hud: Hud = {
      score: Math.floor(this.distance) + this.coins * SCORE_PER_COIN,
      distance: Math.floor(this.distance),
      coins: this.coins,
      speedKmh: Math.round(baseSpeed(this.time) * this.speedMult * 3.6 * (1 - 0.5 * this.crash)),
      shields: Math.max(0, this.shields),
      level: 1 + Math.floor(this.time / 15),
    }
    this.cb.onHud(hud)
  }

  private render(t: number) {
    const ctx = this.ctx
    ctx.save()
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * 12 * this.shake, (Math.random() - 0.5) * 12 * this.shake)
    drawBackdrop(ctx, this.roadOffset, this.speedNow)
    for (const o of this.world.oils) drawOil(ctx, o)
    for (const c of this.world.coins) drawArcCoin(ctx, c.x, c.y, t, c.phase)
    for (const p of this.world.pickups) drawPickup(ctx, p, t)
    for (const h of this.world.hazards) drawHazard(ctx, h)

    const exploded = this.dying > 0
    if (!exploded) {
      const blink = this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0
      drawPlayerCar(ctx, this.px, PLAYER_Y, {
        tilt: this.vx / STEER_MAX * 0.2 + (this.oil > 0 ? Math.sin(t * 18) * 0.12 : 0),
        boost: this.input.boost && this.status === 'running' && this.countdown <= 0,
        braking: this.input.brake,
        speed: this.speedNow,
        alpha: blink ? 0.45 : 1,
        t,
      })
      if (this.invuln > 0) drawShieldBubble(ctx, this.px, PLAYER_Y, Math.min(1, this.invuln))
    }
    drawParticles(ctx, this.world.particles)
    drawPops(ctx, this.world.pops)
    ctx.restore()
    drawVignette(ctx)

    if (this.status === 'running' && this.countdown > 0) {
      ctx.fillStyle = 'rgba(4,5,13,0.45)'
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = NEON.cyan
      ctx.font = '700 120px "Space Grotesk", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(Math.max(1, Math.ceil(this.countdown))), W / 2, H * 0.4)
    }
  }
}
