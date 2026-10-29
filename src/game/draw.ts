import { H, LANES, LANE_W, NEON, ROAD_W, ROAD_X, W } from './constants'
import type { Hazard, Oil, Particle, Pickup, Pop } from './world'

const TILE = 150
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function drawSkyline(ctx: CanvasRenderingContext2D, x0: number, w: number, par: number, seed: number) {
  const shift = ((par % TILE) + TILE) % TILE
  const slot0 = Math.floor(par / TILE)
  for (let i = -1; i < Math.ceil(H / TILE) + 1; i++) {
    const idx = i - slot0 + seed * 91
    const y = i * TILE + shift
    const bw = w * (0.55 + hash(idx) * 0.4)
    const bx = seed === 0 ? x0 + w - bw : x0
    ctx.fillStyle = '#0a0c1c'
    ctx.fillRect(bx, y + 8, bw, TILE - 16)
    ctx.fillStyle = hash(idx + 7) > 0.5 ? 'rgba(34,230,255,0.55)' : 'rgba(255,46,147,0.55)'
    ctx.fillRect(seed === 0 ? bx : bx, y + 8, bw, 2)
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 2; c++) {
        if (hash(idx * 13 + r * 5 + c) > 0.45) {
          ctx.fillStyle = hash(idx + r) > 0.6 ? 'rgba(255,210,63,0.7)' : 'rgba(139,92,255,0.55)'
          ctx.fillRect(bx + 6 + c * (bw / 2 - 4), y + 22 + r * 28, 5, 8)
        }
      }
    }
  }
}

export function drawBackdrop(ctx: CanvasRenderingContext2D, offset: number, speedRatio: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#04050d')
  g.addColorStop(1, '#0b0d24')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  drawSkyline(ctx, 0, ROAD_X - 8, offset * 0.5, 0)
  drawSkyline(ctx, ROAD_X + ROAD_W + 8, ROAD_X - 8, offset * 0.5, 1)

  const rg = ctx.createLinearGradient(0, 0, 0, H)
  rg.addColorStop(0, '#0e1026')
  rg.addColorStop(1, '#14173a')
  ctx.fillStyle = rg
  ctx.fillRect(ROAD_X, 0, ROAD_W, H)

  // glossy bands scrolling with the road
  const band = 180
  const bo = ((offset % band) + band) % band
  ctx.fillStyle = 'rgba(34,230,255,0.035)'
  for (let y = -band + bo; y < H; y += band) ctx.fillRect(ROAD_X, y, ROAD_W, 60)

  // lane dashes
  const period = 76
  const o = ((offset % period) + period) % period
  ctx.fillStyle = 'rgba(232,236,255,0.32)'
  for (let l = 1; l < LANES; l++) {
    const x = ROAD_X + l * LANE_W - 1.5
    for (let y = -period + o; y < H; y += period) ctx.fillRect(x, y, 3, 38)
  }

  // neon edges
  for (const [x, c] of [
    [ROAD_X, NEON.cyan],
    [ROAD_X + ROAD_W, NEON.pink],
  ] as const) {
    ctx.fillStyle = c
    ctx.globalAlpha = 0.12
    ctx.fillRect(x - 9, 0, 18, H)
    ctx.globalAlpha = 0.28
    ctx.fillRect(x - 4, 0, 8, H)
    ctx.globalAlpha = 1
    ctx.fillRect(x - 1.5, 0, 3, H)
  }

  // posts
  const postGap = 120
  const po = ((offset % postGap) + postGap) % postGap
  for (let y = -postGap + po; y < H; y += postGap) {
    ctx.fillStyle = NEON.cyan
    ctx.globalAlpha = 0.9
    ctx.fillRect(ROAD_X - 14, y, 4, 4)
    ctx.fillStyle = NEON.pink
    ctx.fillRect(ROAD_X + ROAD_W + 10, y, 4, 4)
    ctx.globalAlpha = 1
  }

  // speed lines
  if (speedRatio > 0.35) {
    ctx.fillStyle = `rgba(232,236,255,${(speedRatio - 0.35) * 0.35})`
    const sp = offset * 1.7
    for (let i = 0; i < 16; i++) {
      const x = ROAD_X + 6 + hash(i * 3.1) * (ROAD_W - 12)
      const len = 40 + hash(i * 1.7) * 90
      const y = (((sp * (0.8 + hash(i) * 0.6) + i * 211) % (H + 200)) + H + 200) % (H + 200) - 100
      ctx.fillRect(x, y, 1.5, len)
    }
  }
}

function shade(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0)
  g.addColorStop(0, 'rgba(0,0,0,0.35)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.12)')
  g.addColorStop(1, 'rgba(0,0,0,0.4)')
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
  ctx.fillStyle = g
  ctx.fill()
}

interface CarOpts {
  tilt?: number
  boost?: boolean
  braking?: boolean
  player?: boolean
  alpha?: number
}

export function drawCar(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, color: string, o: CarOpts = {}) {
  ctx.save()
  ctx.globalAlpha = o.alpha ?? 1
  ctx.translate(cx, cy)
  if (o.tilt) ctx.rotate(o.tilt)
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, h * 0.8)
  glow.addColorStop(0, o.player ? 'rgba(34,230,255,0.38)' : 'rgba(255,255,255,0.08)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(-w * 1.4, -h * 0.9, w * 2.8, h * 1.8)
  if (o.boost) {
    const f = ctx.createLinearGradient(0, h / 2, 0, h / 2 + 34)
    f.addColorStop(0, 'rgba(255,210,63,0.95)')
    f.addColorStop(1, 'rgba(255,46,147,0)')
    ctx.fillStyle = f
    ctx.beginPath()
    ctx.moveTo(-w * 0.28, h / 2 - 2)
    ctx.lineTo(0, h / 2 + 34 + Math.random() * 8)
    ctx.lineTo(w * 0.28, h / 2 - 2)
    ctx.fill()
  }
  ctx.fillStyle = '#05050a'
  for (const sy of [-0.3, 0.2]) {
    ctx.fillRect(-w / 2 - 3, h * sy, 6, h * 0.22)
    ctx.fillRect(w / 2 - 3, h * sy, 6, h * 0.22)
  }
  shade(ctx, -w / 2, -h / 2, w, h, 11, color)
  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  ctx.fillRect(-2, -h / 2 + 4, 4, h * 0.2)
  // windshield, roof, rear glass
  ctx.fillStyle = 'rgba(8,12,34,0.92)'
  ctx.beginPath()
  ctx.roundRect(-w / 2 + 6, -h * 0.24, w - 12, h * 0.17, 4)
  ctx.fill()
  shade(ctx, -w / 2 + 7, -h * 0.06, w - 14, h * 0.28, 5, color)
  ctx.fillStyle = 'rgba(0,0,0,0.38)'
  ctx.fillRect(-w / 2 + 7, -h * 0.06, w - 14, h * 0.28)
  ctx.fillStyle = 'rgba(8,12,34,0.9)'
  ctx.beginPath()
  ctx.roundRect(-w / 2 + 7, h * 0.24, w - 14, h * 0.1, 3)
  ctx.fill()
  // lights
  ctx.fillStyle = '#fff6c9'
  ctx.fillRect(-w / 2 + 3, -h / 2 + 1, 9, 4)
  ctx.fillRect(w / 2 - 12, -h / 2 + 1, 9, 4)
  ctx.fillStyle = o.braking ? '#ff2e4d' : '#c4143c'
  ctx.fillRect(-w / 2 + 3, h / 2 - 5, 10, 4)
  ctx.fillRect(w / 2 - 13, h / 2 - 5, 10, 4)
  if (o.braking) {
    ctx.fillStyle = 'rgba(255,46,77,0.4)'
    ctx.fillRect(-w / 2, h / 2, w, 10)
  }
  ctx.restore()
}

export function drawHazard(ctx: CanvasRenderingContext2D, hz: Hazard) {
  if (hz.kind === 'car') return drawCar(ctx, hz.x, hz.y, hz.w, hz.h, hz.color)
  ctx.save()
  ctx.translate(hz.x, hz.y)
  if (hz.kind === 'truck') {
    shade(ctx, -hz.w / 2, -hz.h / 2 + 46, hz.w, hz.h - 46, 4, '#1a1d3f')
    ctx.strokeStyle = hz.color
    ctx.globalAlpha = 0.7
    ctx.lineWidth = 2
    for (let y = -hz.h / 2 + 56; y < hz.h / 2 - 6; y += 18) {
      ctx.beginPath()
      ctx.moveTo(-hz.w / 2 + 4, y)
      ctx.lineTo(hz.w / 2 - 4, y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    shade(ctx, -hz.w / 2 + 3, -hz.h / 2, hz.w - 6, 42, 8, hz.color)
    ctx.fillStyle = 'rgba(8,12,34,0.92)'
    ctx.fillRect(-hz.w / 2 + 9, -hz.h / 2 + 8, hz.w - 18, 12)
    ctx.fillStyle = '#c4143c'
    ctx.fillRect(-hz.w / 2 + 4, hz.h / 2 - 5, 10, 4)
    ctx.fillRect(hz.w / 2 - 14, hz.h / 2 - 5, 10, 4)
  } else {
    ctx.beginPath()
    ctx.roundRect(-hz.w / 2, -hz.h / 2, hz.w, hz.h, 5)
    ctx.save()
    ctx.clip()
    ctx.fillStyle = '#ffd23f'
    ctx.fillRect(-hz.w / 2, -hz.h / 2, hz.w, hz.h)
    ctx.fillStyle = '#12142b'
    for (let x = -hz.w; x < hz.w; x += 22) {
      ctx.beginPath()
      ctx.moveTo(x, hz.h / 2)
      ctx.lineTo(x + 11, hz.h / 2)
      ctx.lineTo(x + 25, -hz.h / 2)
      ctx.lineTo(x + 14, -hz.h / 2)
      ctx.fill()
    }
    ctx.restore()
    ctx.fillStyle = 'rgba(255,210,63,0.25)'
    ctx.fillRect(-hz.w / 2 - 4, -hz.h / 2 - 4, hz.w + 8, hz.h + 8)
  }
  ctx.restore()
}

export function drawOil(ctx: CanvasRenderingContext2D, o: Oil) {
  const g = ctx.createRadialGradient(o.x, o.y, 4, o.x, o.y, o.h / 2)
  g.addColorStop(0, 'rgba(4,2,14,0.95)')
  g.addColorStop(0.7, 'rgba(60,20,110,0.8)')
  g.addColorStop(1, 'rgba(34,230,255,0.25)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(o.x, o.y, o.w / 2, o.h / 2, 0, 0, Math.PI * 2)
  ctx.fill()
}

export function drawPops(ctx: CanvasRenderingContext2D, pops: Pop[]) {
  for (const p of pops) {
    const k = p.life / p.max
    ctx.save()
    ctx.globalAlpha = 1 - k
    ctx.strokeStyle = NEON.cyan
    ctx.lineWidth = 3 * (1 - k) + 0.5
    ctx.beginPath()
    ctx.arc(p.x, p.y, 12 + 36 * k, 0, Math.PI * 2)
    ctx.stroke()
    ctx.font = '700 17px "Space Grotesk", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(4,6,30,0.85)'
    ctx.strokeText(p.text, p.x, p.y - 14 - 34 * k)
    ctx.fillStyle = '#d8fcff'
    ctx.fillText(p.text, p.x, p.y - 14 - 34 * k)
    ctx.restore()
  }
}

export function drawPickup(ctx: CanvasRenderingContext2D, p: Pickup, t: number) {
  ctx.save()
  ctx.translate(p.x, p.y + Math.sin(t * 5) * 2)
  ctx.fillStyle = 'rgba(61,255,162,0.2)'
  ctx.beginPath()
  ctx.arc(0, 0, 21, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = NEON.green
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(0, 0, 14, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = NEON.green
  ctx.fillRect(-2.5, -8, 5, 16)
  ctx.fillRect(-8, -2.5, 16, 5)
  ctx.restore()
}

export function drawParticles(ctx: CanvasRenderingContext2D, ps: Particle[]) {
  for (const p of ps) {
    ctx.globalAlpha = Math.max(0, 1 - p.life / p.max)
    ctx.fillStyle = p.color
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
  }
  ctx.globalAlpha = 1
}

export function drawShieldBubble(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = NEON.cyan
  ctx.lineWidth = 2.5
  ctx.fillStyle = 'rgba(34,230,255,0.12)'
  ctx.beginPath()
  ctx.ellipse(x, y, 34, 58, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

export function drawVignette(ctx: CanvasRenderingContext2D) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, 'rgba(0,0,0,0.5)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}
