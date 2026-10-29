/**
 * Original Arc-inspired canvas sprites: the player's sports car, the Arc token (coin) and the "A" mark.
 * All drawing is procedural, so there are no external image assets.
 */

const CYAN = '#22e6ff'
const PURPLE = '#8b5cff'

/** The Arc "A": two legs with an arched crossbar. Unit size `s` is roughly half the glyph height. */
function markPath(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath()
  ctx.moveTo(-0.78 * s, 0.8 * s)
  ctx.lineTo(0, -0.85 * s)
  ctx.lineTo(0.78 * s, 0.8 * s)
  ctx.moveTo(-0.44 * s, 0.4 * s)
  ctx.quadraticCurveTo(0, -0.08 * s, 0.44 * s, 0.4 * s)
}

export function drawArcMark(ctx: CanvasRenderingContext2D, s: number, color = '#c9fbff', glow = 'rgba(34,230,255,0.9)') {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.globalAlpha *= 0.4
  ctx.strokeStyle = glow
  ctx.lineWidth = s * 0.7
  markPath(ctx, s)
  ctx.stroke()
  ctx.globalAlpha /= 0.4
  ctx.strokeStyle = color
  ctx.lineWidth = s * 0.3
  markPath(ctx, s)
  ctx.stroke()
  ctx.restore()
}

/** Collectible Arc token: cyan-blue ring, glowing edge, "A" in the centre, slow spin and shimmer. */
export function drawArcCoin(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, phase: number) {
  const spin = Math.abs(Math.cos(t * 2.4 + phase))
  const sx = 0.6 + 0.4 * spin
  const pulse = 0.8 + 0.2 * Math.sin(t * 5 + phase)
  ctx.save()
  ctx.translate(x, y)
  const glow = ctx.createRadialGradient(0, 0, 5, 0, 0, 27)
  glow.addColorStop(0, `rgba(34,230,255,${0.5 * pulse})`)
  glow.addColorStop(0.6, `rgba(47,139,255,${0.16 * pulse})`)
  glow.addColorStop(1, 'rgba(47,139,255,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(0, 0, 27, 0, Math.PI * 2)
  ctx.fill()

  ctx.scale(sx, 1)
  const ring = ctx.createLinearGradient(-13, -13, 13, 13)
  ring.addColorStop(0, '#b8fbff')
  ring.addColorStop(0.5, '#27c4ff')
  ring.addColorStop(1, '#2f6bff')
  ctx.fillStyle = ring
  ctx.beginPath()
  ctx.arc(0, 0, 13, 0, Math.PI * 2)
  ctx.fill()

  const disc = ctx.createRadialGradient(-3, -4, 1, 0, 0, 10.5)
  disc.addColorStop(0, '#16358a')
  disc.addColorStop(1, '#050a26')
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(0, 0, 10.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(170,245,255,0.75)'
  ctx.lineWidth = 0.9
  ctx.beginPath()
  ctx.arc(0, 0, 10.2, 0, Math.PI * 2)
  ctx.stroke()

  const a = t * 3 + phase
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(0, 0, 11.7, a, a + 0.9)
  ctx.stroke()

  drawArcMark(ctx, 4.8)
  ctx.restore()
}

export interface PlayerCarOpts {
  tilt: number
  boost: boolean
  braking: boolean
  alpha: number
  /** 0..1 share of top speed, drives trail length. */
  speed: number
  t: number
}

function bodyPath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath()
  ctx.moveTo(0, -47)
  ctx.bezierCurveTo(10, -47, 17, -41, 21, -29)
  ctx.bezierCurveTo(24, -15, 24, 8, 24, 24)
  ctx.bezierCurveTo(24, 36, 20, 44, 14, 45)
  ctx.lineTo(-14, 45)
  ctx.bezierCurveTo(-20, 44, -24, 36, -24, 24)
  ctx.bezierCurveTo(-24, 8, -24, -15, -21, -29)
  ctx.bezierCurveTo(-17, -41, -10, -47, 0, -47)
  ctx.closePath()
}

function trails(ctx: CanvasRenderingContext2D, o: PlayerCarOpts) {
  const len = 22 + o.speed * 26 + (o.boost ? 46 : 0) + Math.random() * 6
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const sx of [-9, 9]) {
    const g = ctx.createLinearGradient(0, 44, 0, 44 + len)
    g.addColorStop(0, o.boost ? 'rgba(190,235,255,0.95)' : 'rgba(110,190,255,0.7)')
    g.addColorStop(0.45, 'rgba(47,139,255,0.5)')
    g.addColorStop(1, 'rgba(47,139,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(sx - 5, 44)
    ctx.lineTo(sx + 5, 44)
    ctx.lineTo(sx + 1.2, 44 + len)
    ctx.lineTo(sx - 1.2, 44 + len)
    ctx.closePath()
    ctx.fill()
  }
  if (o.boost) {
    const g = ctx.createRadialGradient(0, 50, 2, 0, 56, 36)
    g.addColorStop(0, 'rgba(120,200,255,0.5)')
    g.addColorStop(1, 'rgba(47,139,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(-40, 40, 80, 70)
  }
  ctx.restore()
}

/** Dark navy sports car, cyan neon outline, purple accents, Arc "A" on the roof. Faces up, centred on (x, y). */
export function drawPlayerCar(ctx: CanvasRenderingContext2D, x: number, y: number, o: PlayerCarOpts) {
  ctx.save()
  ctx.globalAlpha = o.alpha
  ctx.translate(x, y)
  if (o.tilt) ctx.rotate(o.tilt)

  const ug = ctx.createRadialGradient(0, 2, 8, 0, 2, 66)
  ug.addColorStop(0, 'rgba(34,230,255,0.4)')
  ug.addColorStop(0.6, 'rgba(139,92,255,0.14)')
  ug.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = ug
  ctx.fillRect(-72, -72, 144, 144)

  // headlight beams
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const sx of [-1, 1]) {
    const g = ctx.createLinearGradient(0, -40, 0, -118)
    g.addColorStop(0, 'rgba(190,250,255,0.3)')
    g.addColorStop(1, 'rgba(34,230,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(sx * 11, -40)
    ctx.lineTo(sx * 17, -40)
    ctx.lineTo(sx * 30, -118)
    ctx.lineTo(sx * 2, -118)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()

  trails(ctx, o)

  // wheels
  for (const [wx, wy, ww, wh] of [[-29, -34, 6, 20], [23, -34, 6, 20], [-30, 14, 7, 25], [23, 14, 7, 25]]) {
    ctx.fillStyle = '#03040b'
    ctx.beginPath()
    ctx.roundRect(wx, wy, ww, wh, 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(34,230,255,0.55)'
    ctx.fillRect(wx < 0 ? wx : wx + ww - 1.2, wy + 4, 1.2, wh - 8)
  }

  // body
  const bg = ctx.createLinearGradient(-24, 0, 24, 0)
  bg.addColorStop(0, '#04061a')
  bg.addColorStop(0.3, '#17205f')
  bg.addColorStop(0.62, '#0b1141')
  bg.addColorStop(1, '#03051a')
  bodyPath(ctx)
  ctx.fillStyle = bg
  ctx.fill()
  const sheen = ctx.createLinearGradient(0, -47, 0, 45)
  sheen.addColorStop(0, 'rgba(139,92,255,0.38)')
  sheen.addColorStop(0.45, 'rgba(139,92,255,0)')
  sheen.addColorStop(1, 'rgba(34,230,255,0.12)')
  ctx.fillStyle = sheen
  ctx.fill()
  ctx.lineJoin = 'round'
  ctx.strokeStyle = 'rgba(34,230,255,0.28)'
  ctx.lineWidth = 5
  ctx.stroke()
  ctx.strokeStyle = CYAN
  ctx.lineWidth = 1.6
  ctx.stroke()

  // hood: centre stripe, vents
  ctx.strokeStyle = 'rgba(139,92,255,0.85)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, -45)
  ctx.lineTo(0, -24)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(34,230,255,0.6)'
  ctx.lineWidth = 1.2
  for (const sx of [-1, 1]) {
    for (const vy of [-36, -31]) {
      ctx.beginPath()
      ctx.moveTo(sx * 5, vy)
      ctx.lineTo(sx * 11, vy - 3)
      ctx.stroke()
    }
  }
  // neon side skirts
  ctx.strokeStyle = 'rgba(34,230,255,0.75)'
  for (const sx of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(sx * 21.5, -12)
    ctx.lineTo(sx * 22, 24)
    ctx.stroke()
  }

  // windshield
  const wg = ctx.createLinearGradient(-14, -22, 14, -6)
  wg.addColorStop(0, '#02030f')
  wg.addColorStop(0.55, '#0c2a5c')
  wg.addColorStop(1, '#03061a')
  ctx.fillStyle = wg
  ctx.beginPath()
  ctx.moveTo(-14, -22)
  ctx.lineTo(14, -22)
  ctx.lineTo(12, -6)
  ctx.lineTo(-12, -6)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(34,230,255,0.55)'
  ctx.lineWidth = 0.9
  ctx.stroke()
  ctx.strokeStyle = 'rgba(190,250,255,0.35)'
  ctx.beginPath()
  ctx.moveTo(-8, -20)
  ctx.lineTo(-3, -8)
  ctx.stroke()

  // side + rear glass
  ctx.fillStyle = '#030617'
  for (const sx of [-1, 1]) ctx.fillRect(sx < 0 ? -19 : 14, -3, 5, 17)
  ctx.beginPath()
  ctx.moveTo(-11, 17)
  ctx.lineTo(11, 17)
  ctx.lineTo(9, 28)
  ctx.lineTo(-9, 28)
  ctx.closePath()
  ctx.fill()

  // roof + Arc mark
  const rg = ctx.createLinearGradient(-12, -5, 12, 17)
  rg.addColorStop(0, '#1b2672')
  rg.addColorStop(1, '#0a0f38')
  ctx.fillStyle = rg
  ctx.beginPath()
  ctx.roundRect(-12, -5, 24, 22, 6)
  ctx.fill()
  ctx.strokeStyle = 'rgba(139,92,255,0.8)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.save()
  ctx.translate(0, 6.5)
  drawArcMark(ctx, 7.2)
  ctx.restore()

  // mirrors
  ctx.fillStyle = '#0b1141'
  ctx.strokeStyle = CYAN
  ctx.lineWidth = 0.8
  for (const mx of [-28, 23]) {
    ctx.beginPath()
    ctx.roundRect(mx, -15, 5, 6, 1.5)
    ctx.fill()
    ctx.stroke()
  }

  // spoiler + tail light bar
  ctx.fillStyle = '#05071a'
  ctx.strokeStyle = CYAN
  ctx.beginPath()
  ctx.roundRect(-21, 38, 42, 5, 2)
  ctx.fill()
  ctx.stroke()
  const tl = ctx.createLinearGradient(-14, 0, 14, 0)
  tl.addColorStop(0, o.braking ? '#ff3b5c' : PURPLE)
  tl.addColorStop(1, o.braking ? '#ff3b5c' : '#ff2e93')
  ctx.fillStyle = tl
  ctx.fillRect(-14, 33, 28, 2.2)
  if (o.braking) {
    ctx.fillStyle = 'rgba(255,59,92,0.35)'
    ctx.fillRect(-18, 30, 36, 10)
  }

  // headlights
  for (const sx of [-1, 1]) {
    const hg = ctx.createRadialGradient(sx * 13, -38, 0, sx * 13, -38, 9)
    hg.addColorStop(0, 'rgba(230,253,255,1)')
    hg.addColorStop(0.5, 'rgba(34,230,255,0.55)')
    hg.addColorStop(1, 'rgba(34,230,255,0)')
    ctx.fillStyle = hg
    ctx.beginPath()
    ctx.arc(sx * 13, -38, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#f0feff'
    ctx.beginPath()
    ctx.moveTo(sx * 9, -41)
    ctx.lineTo(sx * 17, -35)
    ctx.lineTo(sx * 16, -33)
    ctx.lineTo(sx * 9, -37)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}
