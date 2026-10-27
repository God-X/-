import type { EnemyKind } from '../config'
import { TAU } from '../math'
import type { Enemy } from '../types'

interface Palette {
  skin: string
  skinDark: string
  cloth: string
  clothDark: string
  eye: string
  blood: string
  bone: string
  metal: string
}

function mix(hex: string, toward: string, t: number): string {
  const parse = (value: string) => [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ]
  const from = parse(hex)
  const to = parse(toward)
  const channel = (index: number) =>
    Math.round(from[index] + (to[index] - from[index]) * t)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(0)}${channel(1)}${channel(2)}`
}

function palette(kind: EnemyKind, crawler: boolean, flash: boolean, frozen: boolean): Palette {
  const base: Palette = crawler
    ? {
        skin: '#b7c48a',
        skinDark: '#8ea068',
        cloth: '#6d624f',
        clothDark: '#4e4638',
        eye: '#f2e7a2',
        blood: '#8d3030',
        bone: '#d9d0bf',
        metal: '#8d8680',
      }
    : {
        grunt: {
          skin: '#7f9a52',
          skinDark: '#5d7540',
          cloth: '#6a5340',
          clothDark: '#463628',
          eye: '#f3e29a',
          blood: '#9a3030',
          bone: '#d7ccb8',
          metal: '#8a847c',
        },
        fast: {
          skin: '#9bb86a',
          skinDark: '#6e8a48',
          cloth: '#5a4636',
          clothDark: '#3c2d22',
          eye: '#ff5a4a',
          blood: '#a33',
          bone: '#eadfcd',
          metal: '#777',
        },
        tank: {
          skin: '#5f7a40',
          skinDark: '#3f552c',
          cloth: '#4a4036',
          clothDark: '#2d2822',
          eye: '#f6e7a4',
          blood: '#7d2828',
          bone: '#cfc4b0',
          metal: '#9aa3a8',
        },
        splitter: {
          skin: '#8aa45a',
          skinDark: '#61783e',
          cloth: '#6e583c',
          clothDark: '#4a3824',
          eye: '#ffe38a',
          blood: '#a33b3b',
          bone: '#e6dcc8',
          metal: '#777',
        },
        flyer: {
          skin: '#a3b36e',
          skinDark: '#74844c',
          cloth: '#5c4a55',
          clothDark: '#3d3038',
          eye: '#ffd0ea',
          blood: '#9a4060',
          bone: '#e7d5df',
          metal: '#666',
        },
        boss: {
          skin: '#6d8a48',
          skinDark: '#44562e',
          cloth: '#3c342c',
          clothDark: '#241e1a',
          eye: '#ffb03a',
          blood: '#b43838',
          bone: '#efe6d4',
          metal: '#b9a27a',
        },
      }[kind]

  if (!flash && !frozen) return base
  const toward = flash ? '#f4fff0' : '#b9e7ff'
  const amount = flash ? 0.72 : 0.45
  return {
    skin: mix(base.skin, toward, amount),
    skinDark: mix(base.skinDark, toward, amount),
    cloth: mix(base.cloth, toward, amount),
    clothDark: mix(base.clothDark, toward, amount),
    eye: flash ? '#ffffff' : base.eye,
    blood: mix(base.blood, toward, amount * 0.5),
    bone: mix(base.bone, toward, amount * 0.4),
    metal: mix(base.metal, toward, amount),
  }
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

function drawGrunt(ctx: CanvasRenderingContext2D, step: number, pal: Palette): void {
  rect(ctx, -3, 1, 3, 7, pal.clothDark)
  rect(ctx, 1, 1 + step, 3, 7, pal.clothDark)
  rect(ctx, -4, 7, 4, 2, pal.skinDark)
  rect(ctx, 1, 7 + step, 4, 2, pal.skinDark)
  rect(ctx, -4, -8, 8, 10, pal.cloth)
  rect(ctx, 0, -3, 3, 3, pal.skin)
  rect(ctx, -3, -15, 8, 8, pal.skin)
  rect(ctx, -3, -15, 8, 2, pal.skinDark)
  rect(ctx, 3, -13, 2, 2, pal.eye)
  rect(ctx, 2, -10, 3, 1, pal.blood)
  rect(ctx, 3, -6, 7, 2, pal.skin)
  rect(ctx, 9, -7, 2, 2, pal.skinDark)
  rect(ctx, -8, -5 + step, 4, 2, pal.skinDark)
}

function drawFast(ctx: CanvasRenderingContext2D, step: number, pal: Palette): void {
  rect(ctx, -2, 0, 2, 8, pal.skinDark)
  rect(ctx, 1, step * 1.4, 2, 8, pal.skinDark)
  rect(ctx, -3, -8, 6, 9, pal.skin)
  rect(ctx, -2, -16, 6, 8, pal.skin)
  rect(ctx, -2, -16, 6, 2, pal.skinDark)
  rect(ctx, 2, -13, 2, 2, pal.eye)
  rect(ctx, 1, -10, 3, 1, pal.blood)
  rect(ctx, 3, -7, 9, 2, pal.skin)
  rect(ctx, -7, -4, 4, 2, pal.skinDark)
}

function drawTank(ctx: CanvasRenderingContext2D, step: number, pal: Palette): void {
  rect(ctx, -5, 2, 4, 6, pal.clothDark)
  rect(ctx, 2, 2 + step * 0.4, 4, 6, pal.clothDark)
  rect(ctx, -7, -8, 14, 12, pal.skin)
  rect(ctx, -5, -4, 10, 7, pal.skinDark)
  rect(ctx, -8, -10, 5, 6, pal.metal)
  rect(ctx, -4, -16, 8, 8, pal.skin)
  rect(ctx, 2, -14, 2, 2, pal.eye)
  rect(ctx, 1, -11, 4, 2, pal.blood)
  rect(ctx, 5, -6, 6, 3, pal.skinDark)
  rect(ctx, -2, -18, 2, 3, pal.bone)
}

function drawSplitter(ctx: CanvasRenderingContext2D, step: number, pal: Palette): void {
  drawGrunt(ctx, step, pal)
  rect(ctx, -6, -16, 5, 5, pal.skinDark)
  rect(ctx, -5, -15, 2, 2, pal.eye)
  rect(ctx, -1, -6, 2, 4, pal.blood)
  rect(ctx, 2, -2, 3, 3, pal.skin)
}

function drawFlyer(ctx: CanvasRenderingContext2D, step: number, pal: Palette, flap: number): void {
  ctx.fillStyle = pal.clothDark
  ctx.beginPath()
  ctx.moveTo(-2, -4)
  ctx.lineTo(-16, -12 - flap)
  ctx.lineTo(-12, -2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(0, -4)
  ctx.lineTo(14, -14 + flap)
  ctx.lineTo(10, -1)
  ctx.fill()
  rect(ctx, -3, -6, 8, 7, pal.skin)
  rect(ctx, 2, -12, 6, 6, pal.skin)
  rect(ctx, 6, -10, 2, 2, pal.eye)
  rect(ctx, 5, -8, 3, 1, pal.blood)
  rect(ctx, -2, 1, 2, 4, pal.skinDark)
  rect(ctx, 2, 1 + step, 2, 4, pal.skinDark)
}

function drawBoss(ctx: CanvasRenderingContext2D, step: number, pal: Palette): void {
  rect(ctx, -6, 2, 5, 8, pal.clothDark)
  rect(ctx, 2, 2 + step * 0.5, 5, 8, pal.clothDark)
  rect(ctx, -10, -12, 20, 16, pal.skin)
  rect(ctx, -6, -6, 12, 8, pal.skinDark)
  rect(ctx, -2, -2, 5, 3, pal.blood)
  rect(ctx, -6, -20, 12, 10, pal.skin)
  rect(ctx, -4, -17, 2, 2, pal.eye)
  rect(ctx, 2, -17, 2, 2, pal.eye)
  rect(ctx, -2, -13, 5, 2, pal.blood)
  rect(ctx, 8, -7, 7, 3, pal.skinDark)
  rect(ctx, -13, -5, 4, 3, pal.skinDark)
  rect(ctx, -5, -24, 2, 5, pal.bone)
  rect(ctx, 3, -25, 2, 6, pal.bone)
  rect(ctx, -1, -26, 2, 5, pal.bone)
}

function drawCrawler(ctx: CanvasRenderingContext2D, step: number, pal: Palette): void {
  rect(ctx, -6, -2, 12, 5, pal.skin)
  rect(ctx, 4, -6, 6, 5, pal.skin)
  rect(ctx, 8, -5, 2, 2, pal.eye)
  rect(ctx, 7, -3, 3, 1, pal.blood)
  rect(ctx, 6, 1, 4, 2, pal.skinDark)
  rect(ctx, -8, -1 + step, 3, 2, pal.skinDark)
  rect(ctx, -2, 2, 3, 2, pal.cloth)
}

/** Pixel zombie facing the city. Gameplay radius is unchanged. */
export function drawZombie(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number): void {
  const crawler = enemy.kind === 'grunt' && enemy.radius <= 10
  const flash = enemy.hitFlash > 0
  const frozen = time < enemy.slowUntil
  const pal = palette(enemy.kind, crawler, flash, frozen)
  const gait = enemy.kind === 'fast' ? 14 : enemy.kind === 'boss' || enemy.kind === 'tank' ? 5 : 8
  const step = Math.sin(time * gait + enemy.wobblePhase) * (enemy.kind === 'tank' ? 0.8 : 1.4)
  const face = Math.atan2(-enemy.y, -enemy.x)
  const lift = enemy.kind === 'flyer' ? -9 + Math.sin(time * 7 + enemy.wobblePhase) * 2.5 : 0

  ctx.save()
  ctx.translate(enemy.x, enemy.y)
  ctx.fillStyle = 'rgba(0,0,0,0.38)'
  ctx.beginPath()
  ctx.ellipse(0, 5, enemy.radius * 0.85, enemy.radius * 0.32, 0, 0, TAU)
  ctx.fill()
  ctx.translate(0, lift - Math.abs(step) * 0.35)
  ctx.rotate(face)
  const scale = Math.min(enemy.kind === 'boss' ? 3 : 2.7, Math.max(1.2, enemy.radius / 8))
  ctx.scale(scale, scale)

  if (crawler) drawCrawler(ctx, step, pal)
  else if (enemy.kind === 'fast') drawFast(ctx, step, pal)
  else if (enemy.kind === 'tank') drawTank(ctx, step, pal)
  else if (enemy.kind === 'splitter') drawSplitter(ctx, step, pal)
  else if (enemy.kind === 'flyer') drawFlyer(ctx, step, pal, Math.sin(time * 12 + enemy.wobblePhase) * 4)
  else if (enemy.kind === 'boss') drawBoss(ctx, step, pal)
  else drawGrunt(ctx, step, pal)
  ctx.restore()
}

function tower(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  rect(ctx, x, y, 12, 20, '#6d6458')
  rect(ctx, x - 1, y - 6, 14, 6, '#857868')
  rect(ctx, x + 1, y - 10, 3, 5, '#7b6f60')
  rect(ctx, x + 8, y - 10, 3, 5, '#7b6f60')
  rect(ctx, x + 4, y + 6, 3, 4, '#f0c27a')
}

/** The player's starting city. Sits inside the turret ring. */
export function drawCity(ctx: CanvasRenderingContext2D, hpFrac: number, time: number): void {
  const low = hpFrac < 0.3
  ctx.fillStyle = '#4a4032'
  ctx.beginPath()
  ctx.ellipse(0, 10, 54, 24, 0, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#5c5346'
  ctx.beginPath()
  ctx.ellipse(0, 8, 40, 16, 0, 0, TAU)
  ctx.fill()

  rect(ctx, -36, -24, 72, 50, '#7a7062')
  rect(ctx, -36, -28, 72, 6, '#8d8272')
  ctx.fillStyle = '#6a6154'
  for (let x = -34; x <= 30; x += 8) rect(ctx, x, -36, 4, 8, '#6a6154')

  tower(ctx, -40, -30)
  tower(ctx, 28, -30)
  tower(ctx, -40, 8)
  tower(ctx, 28, 8)

  rect(ctx, -22, -2, 16, 12, '#d8c7a4')
  ctx.fillStyle = '#8d4634'
  ctx.beginPath()
  ctx.moveTo(-24, -2)
  ctx.lineTo(-14, -12)
  ctx.lineTo(-4, -2)
  ctx.fill()
  rect(ctx, 6, 0, 14, 10, '#cbb892')
  ctx.fillStyle = '#7d4030'
  ctx.beginPath()
  ctx.moveTo(4, 0)
  ctx.lineTo(13, -9)
  ctx.lineTo(22, 0)
  ctx.fill()

  rect(ctx, -9, -20, 18, 30, '#5e564c')
  ctx.fillStyle = low ? '#6a4038' : '#6e624f'
  ctx.beginPath()
  ctx.moveTo(-12, -20)
  ctx.lineTo(0, -34)
  ctx.lineTo(12, -20)
  ctx.fill()

  const glow = low ? 0.45 + Math.sin(time * 8) * 0.35 : 0.75 + Math.sin(time * 3) * 0.25
  ctx.fillStyle = `rgba(255, ${low ? 120 : 186}, 80, ${glow})`
  rect(ctx, -5, -14, 3, 4, ctx.fillStyle)
  rect(ctx, 2, -14, 3, 4, ctx.fillStyle)
  rect(ctx, -2, -4, 4, 6, ctx.fillStyle)

  rect(ctx, -8, 14, 16, 14, '#2c1c14')
  rect(ctx, -6, 16, 12, 12, '#6b4224')
  rect(ctx, -1, 16, 2, 12, '#3a2416')

  ctx.strokeStyle = '#2a241c'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, -34)
  ctx.lineTo(0, -48)
  ctx.stroke()
  const flutter = Math.sin(time * 5) * 2
  ctx.fillStyle = low ? '#8a3030' : '#c4473a'
  ctx.beginPath()
  ctx.moveTo(0, -48)
  ctx.lineTo(14 + flutter, -44)
  ctx.lineTo(0, -40)
  ctx.fill()

  ctx.beginPath()
  ctx.arc(0, 0, 52, 0, TAU)
  ctx.strokeStyle = 'rgba(20, 14, 10, 0.45)'
  ctx.lineWidth = 4
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, 52, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0, hpFrac))
  ctx.strokeStyle = low ? '#e15a4a' : '#e6b15a'
  ctx.lineWidth = 3
  ctx.stroke()
}
