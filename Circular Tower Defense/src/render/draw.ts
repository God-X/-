import { CONFIG, VIEW_H, VIEW_W } from '../config'
import type { Game } from '../game'
import { TAU } from '../math'
import { turretPlacement } from '../systems/targeting'
import { derived, shotColor } from '../systems/upgrades'
import type { Enemy, UpgradeCategory } from '../types'
import { gameOverLayout, upgradeLayout } from '../ui/layout'
import { fitCamera } from './camera'
import { drawCity, drawZombie } from './sprites'

const FONT = '"WenQuanYi Micro Hei", "Droid Sans Fallback", "PingFang SC", sans-serif'

const CATEGORY_COLOR: Record<UpgradeCategory, string> = {
  炮塔: '#7af0ff',
  效果: '#ffb15e',
  机制: '#c6ff6a',
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))
  const m = Math.floor(whole / 60)
  const s = whole % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function draw(ctx: CanvasRenderingContext2D, game: Game, pixelW: number, pixelH: number): void {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = '#05060f'
  ctx.fillRect(0, 0, pixelW, pixelH)
  const camera = fitCamera(pixelW, pixelH)
  ctx.setTransform(camera.scale, 0, 0, camera.scale, camera.ox, camera.oy)
  ctx.beginPath()
  ctx.rect(0, 0, VIEW_W, VIEW_H)
  ctx.clip()
  drawBackdrop(ctx, game)

  const mag = game.shake * 7
  const sx = Math.sin(game.time * 42) * mag
  const sy = Math.cos(game.time * 35) * mag
  ctx.save()
  ctx.translate(VIEW_W / 2 + sx, VIEW_H / 2 + sy)
  drawWorld(ctx, game)
  ctx.restore()

  drawHud(ctx, game)
  if (game.mode === 'upgrade') drawUpgrade(ctx, game)
  if (game.mode === 'gameover') drawGameOver(ctx, game)
  ctx.restore()
}

function drawBackdrop(ctx: CanvasRenderingContext2D, game: Game): void {
  const bg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 30, VIEW_W / 2, VIEW_H / 2, 540)
  bg.addColorStop(0, '#4a4034')
  bg.addColorStop(0.42, '#2a2118')
  bg.addColorStop(1, '#120d0c')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)

  ctx.save()
  ctx.translate(VIEW_W / 2, VIEW_H / 2)
  ctx.strokeStyle = 'rgba(86, 64, 40, 0.16)'
  ctx.lineWidth = 8
  ctx.lineCap = 'butt'
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * TAU + 0.2
    ctx.beginPath()
    ctx.moveTo(Math.cos(angle) * 78, Math.sin(angle) * 78)
    ctx.lineTo(Math.cos(angle) * 520, Math.sin(angle) * 520)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(40, 30, 20, 0.55)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, CONFIG.ring.radius, 0, TAU)
  ctx.stroke()
  ctx.restore()

  ctx.fillStyle = 'rgba(28, 22, 16, 0.7)'
  for (const [x, y] of [
    [48, 150],
    [410, 220],
    [70, 620],
    [400, 680],
    [36, 400],
    [446, 470],
  ] as const) {
    ctx.beginPath()
    ctx.ellipse(x, y, 8, 4, 0.5, 0, TAU)
    ctx.fill()
  }

  if (game.bossWave && game.mode === 'playing') {
    ctx.fillStyle = 'rgba(90, 16, 16, 0.16)'
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  }

  const vignette = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 120, VIEW_W / 2, VIEW_H / 2, 480)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)
}

function drawWorld(ctx: CanvasRenderingContext2D, game: Game): void {
  const stats = derived(game.mods)
  const count = game.mods.turretCount
  const color = shotColor(game.mods)

  const chevronR = CONFIG.ring.radius + 18
  ctx.fillStyle = 'rgba(214, 176, 96, 0.85)'
  for (let i = 0; i < 3; i++) {
    const angle = game.ring.angle + game.ring.direction * (0.35 + i * 0.28)
    const x = Math.cos(angle) * chevronR
    const y = Math.sin(angle) * chevronR
    const tangent = angle + game.ring.direction * Math.PI * 0.5
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(tangent)
    ctx.beginPath()
    ctx.moveTo(7, 0)
    ctx.lineTo(-5, 4.5)
    ctx.lineTo(-5, -4.5)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  if (game.novaFlash > 0) {
    ctx.beginPath()
    ctx.arc(0, 0, 40 + (0.35 - game.novaFlash) * 900, 0, TAU)
    ctx.strokeStyle = `rgba(180, 250, 255, ${game.novaFlash * 2})`
    ctx.lineWidth = 8
    ctx.stroke()
  }

  drawBase(ctx, game)

  for (let i = 0; i < count; i++) {
    const place = turretPlacement(game.ring, i, count)
    const aim = game.turrets[i]?.aim ?? place.angle
    const range = CONFIG.turret.range * stats.rangeMul
    const target = closestForSight(game, place.x, place.y, range)
    if (target) {
      ctx.beginPath()
      ctx.moveTo(place.x, place.y)
      ctx.lineTo(target.x, target.y)
      ctx.strokeStyle = 'rgba(180, 60, 48, 0.28)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
    drawBallista(ctx, place.x, place.y, aim, color)
  }

  for (const enemy of game.enemies.active) drawEnemy(ctx, game, enemy)

  for (const bullet of game.bullets.active) {
    ctx.beginPath()
    ctx.arc(bullet.x, bullet.y, bullet.radius + 2, 0, TAU)
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, TAU)
    ctx.fillStyle = bullet.color
    ctx.fill()
  }

  for (const bolt of game.lightnings) {
    ctx.beginPath()
    ctx.moveTo(bolt.x1, bolt.y1)
    ctx.lineTo(bolt.x2, bolt.y2)
    ctx.strokeStyle = `rgba(214, 180, 255, ${Math.min(1, bolt.life * 8)})`
    ctx.lineWidth = 2
    ctx.stroke()
  }

  for (const particle of game.particles.active) {
    const alpha = Math.max(0, particle.life / particle.maxLife)
    ctx.globalAlpha = alpha
    ctx.fillStyle = particle.color
    ctx.fillRect(particle.x - particle.radius, particle.y - particle.radius, particle.radius * 2, particle.radius * 2)
    ctx.globalAlpha = 1
  }

  for (const pickup of game.pickups.active) {
    ctx.save()
    ctx.translate(pickup.x, pickup.y)
    ctx.rotate(game.time * 2)
    ctx.fillStyle = '#ffd56a'
    ctx.fillRect(-5, -5, 10, 10)
    ctx.restore()
  }

  ctx.font = `12px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const floater of game.floaters) {
    ctx.globalAlpha = Math.max(0, floater.life / 0.7)
    ctx.fillStyle = floater.color
    ctx.fillText(floater.text, floater.x, floater.y)
    ctx.globalAlpha = 1
  }
}

function closestForSight(game: Game, x: number, y: number, range: number): Enemy | null {
  let best: Enemy | null = null
  let bestDist = range * range
  for (const enemy of game.enemies.active) {
    const dx = enemy.x - x
    const dy = enemy.y - y
    const dist = dx * dx + dy * dy
    if (dist < bestDist) {
      bestDist = dist
      best = enemy
    }
  }
  return best
}

function drawBallista(ctx: CanvasRenderingContext2D, x: number, y: number, aim: number, color: string): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = '#4e463c'
  ctx.fillRect(-7, -7, 14, 14)
  ctx.strokeStyle = '#2a241c'
  ctx.lineWidth = 2
  ctx.strokeRect(-7, -7, 14, 14)
  ctx.rotate(aim)
  ctx.strokeStyle = '#6b4328'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(2, -7)
  ctx.lineTo(16, 0)
  ctx.lineTo(2, 7)
  ctx.stroke()
  ctx.strokeStyle = '#cbb892'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(2, -6)
  ctx.lineTo(2, 6)
  ctx.stroke()
  ctx.fillStyle = color
  ctx.fillRect(14, -1.5, 6, 3)
  ctx.restore()
}

function drawBase(ctx: CanvasRenderingContext2D, game: Game): void {
  const frac = game.baseMaxHp <= 0 ? 0 : Math.max(0, game.baseHp) / game.baseMaxHp
  drawCity(ctx, frac, game.time)
}

function drawEnemy(ctx: CanvasRenderingContext2D, game: Game, enemy: Enemy): void {
  const slowed = game.time < enemy.slowUntil
  drawZombie(ctx, enemy, game.time)

  if (enemy.kind === 'boss') {
    ctx.font = `bold 11px ${FONT}`
    ctx.fillStyle = '#f0d7a2'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText('尸王', enemy.x, enemy.y - enemy.radius - 14)
  }

  const width = enemy.radius * 2
  const ratio = Math.max(0, enemy.hp / enemy.maxHp)
  if (ratio < 0.999) {
    const top = enemy.y - enemy.radius - 8
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(enemy.x - enemy.radius, top, width, 3)
    ctx.fillStyle = slowed ? '#9fd8ee' : '#d7e7a4'
    ctx.fillRect(enemy.x - enemy.radius, top, width * ratio, 3)
  }
}

function drawHud(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.font = `bold 22px ${FONT}`
  ctx.fillStyle = '#f3e6cf'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('丧尸攻城', 20, 32)

  ctx.font = `14px ${FONT}`
  ctx.fillStyle = game.bossWave ? '#ff8ad8' : '#9eb4d6'
  ctx.textAlign = 'right'
  ctx.fillText(game.bossWave ? `精英 · 第 ${game.wave} 波` : `第 ${game.wave} 波`, VIEW_W - 20, 28)
  ctx.fillStyle = '#7d90ad'
  ctx.fillText(formatTime(game.elapsed), VIEW_W - 20, 48)

  const barX = 20
  const barY = 52
  const barW = 180
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  roundRect(ctx, barX, barY, barW, 8, 4)
  ctx.fill()
  const frac = game.baseMaxHp <= 0 ? 0 : Math.max(0, game.baseHp) / game.baseMaxHp
  ctx.fillStyle = frac < 0.3 ? '#e15a4a' : '#e6b15a'
  roundRect(ctx, barX, barY, Math.max(0, barW * frac), 8, 4)
  ctx.fill()

  if (game.mods.goldLevel > 0) {
    ctx.font = `14px ${FONT}`
    ctx.fillStyle = '#ffd56a'
    ctx.textAlign = 'left'
    ctx.fillText(`金币 ${game.gold}`, 20, 78)
  }

  const stats = derived(game.mods)
  const cap = CONFIG.ring.maxSpin * stats.maxSpinMul
  const spinFrac = Math.min(1, Math.abs(game.ring.spin) / cap)
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  roundRect(ctx, 20, VIEW_H - 36, 140, 8, 4)
  ctx.fill()
  ctx.fillStyle = game.ring.spin >= 0 ? '#e6b15a' : '#d36a4a'
  roundRect(ctx, 20, VIEW_H - 36, 140 * spinFrac, 8, 4)
  ctx.fill()
  ctx.font = `12px ${FONT}`
  ctx.fillStyle = '#9eb4d6'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  ctx.fillText(game.ring.spin >= 0 ? '顺时针转速' : '逆时针转速', 20, VIEW_H - 40)

  if (game.hintLife > 0 && game.mode === 'playing') {
    ctx.globalAlpha = Math.min(1, game.hintLife)
    ctx.font = `15px ${FONT}`
    ctx.fillStyle = '#e7f7ff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('拖动加速旋转 · 轻点反向', VIEW_W / 2, VIEW_H - 96)
    ctx.font = `12px ${FONT}`
    ctx.fillStyle = '#cbb892'
    ctx.fillText('键盘 A / D 加速，空格反向', VIEW_W / 2, VIEW_H - 76)
    ctx.globalAlpha = 1
  }

  if (game.bannerLife > 0 && game.mode === 'playing') {
    ctx.globalAlpha = Math.min(1, game.bannerLife)
    ctx.font = `bold 28px ${FONT}`
    ctx.fillStyle = game.bossWave ? '#ff8ad8' : '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(game.banner, VIEW_W / 2, 150)
    ctx.globalAlpha = 1
  }
}

function drawUpgrade(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = 'rgba(5, 6, 16, 0.78)'
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold 28px ${FONT}`
  ctx.fillText(game.upgradePhase === 'pick' ? '选择一项升级' : '要再买一次吗', VIEW_W / 2, 168)
  ctx.font = `14px ${FONT}`
  ctx.fillStyle = '#9eb4d6'
  ctx.fillText(`已守住 ${game.stats.wavesCleared} 波 · 击杀 ${game.stats.kills}`, VIEW_W / 2, 204)

  const layout = upgradeLayout()
  if (game.upgradePhase === 'pick') {
    game.choices.forEach((choice, index) => {
      const card = layout.cards[index]
      ctx.fillStyle = 'rgba(16, 22, 40, 0.95)'
      roundRect(ctx, card.x, card.y, card.w, card.h, 14)
      ctx.fill()
      ctx.strokeStyle = CATEGORY_COLOR[choice.category]
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = CATEGORY_COLOR[choice.category]
      ctx.fillRect(card.x, card.y + 12, 4, card.h - 24)
      ctx.font = `12px ${FONT}`
      ctx.textAlign = 'left'
      ctx.fillText(choice.category, card.x + 18, card.y + 24)
      ctx.font = `bold 18px ${FONT}`
      ctx.fillStyle = '#f4fbff'
      ctx.fillText(choice.title, card.x + 18, card.y + 50)
      ctx.font = `13px ${FONT}`
      ctx.fillStyle = '#b7c6dc'
      ctx.fillText(choice.detail, card.x + 18, card.y + 74)
    })
    return
  }

  ctx.font = `bold 20px ${FONT}`
  ctx.fillStyle = '#7af0ff'
  ctx.textAlign = 'center'
  ctx.fillText(game.lastUpgrade, VIEW_W / 2, 280)
  ctx.font = `15px ${FONT}`
  ctx.fillStyle = '#ffd56a'
  ctx.fillText(`金币 ${game.gold} · 再选一次需要 ${CONFIG.goldCost}`, VIEW_W / 2, 320)

  drawButton(ctx, layout.next, '下一波', '#1b2838', '#d5e6f5')
  drawButton(ctx, layout.buy, `购买 ${CONFIG.goldCost}`, '#3a3014', '#ffd56a')
}

function drawButton(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number; h: number },
  label: string,
  fill: string,
  text: string,
): void {
  ctx.fillStyle = fill
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12)
  ctx.fill()
  ctx.strokeStyle = text
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.font = `bold 16px ${FONT}`
  ctx.fillStyle = text
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2)
}

function drawGameOver(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.fillStyle = 'rgba(5, 6, 16, 0.82)'
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ff6b8a'
  ctx.font = `bold 36px ${FONT}`
  ctx.fillText('城池陷落', VIEW_W / 2, 250)
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold 22px ${FONT}`
  ctx.fillText(`存活 ${game.stats.wavesCleared} 波`, VIEW_W / 2, 320)
  ctx.font = `16px ${FONT}`
  ctx.fillStyle = '#b7c6dc'
  ctx.fillText(`倒在第 ${game.wave} 波`, VIEW_W / 2, 358)
  ctx.fillText(`击杀 ${game.stats.kills} · 用时 ${formatTime(game.elapsed)}`, VIEW_W / 2, 390)
  drawButton(ctx, gameOverLayout().restart, '再来一局', '#102830', '#7af0ff')
}
