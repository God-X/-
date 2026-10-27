import { CONFIG, VIEW_H, VIEW_W, type EnemyKind } from './config'
import { clamp } from './math'
import { mulberry32 } from './rng'
import { makeEnemy, spawnEnemy, spawnSplitling, updateEnemies } from './systems/enemies'
import { createGesture, gestureDown, gestureMove, gestureUp } from './systems/input'
import { burst, makeParticle, updateParticles } from './systems/particles'
import { makePickup, updatePickups } from './systems/pickups'
import { Pool } from './systems/pool'
import { updateBullets } from './systems/projectiles'
import { createRing, nudgeSpin, reverseRing, updateRing, applySweep } from './systems/ring'
import { makeBullet, updateTurrets } from './systems/targeting'
import { applyUpgrade, defaultMods, derived, rollChoices } from './systems/upgrades'
import { buildWave, rollSpawnAngle, spawnPosition, type WavePlan } from './systems/waves'
import type { Enemy, Floater, Lightning, Mode, RingState, RunMods, Stats, TurretState, UpgradeChoice } from './types'
import { contains, gameOverLayout, upgradeLayout, viewToWorld } from './ui/layout'

export interface SplitRequest {
  x: number
  y: number
}

/**
 * DOM-free match. Renderer and pointer translation live outside so the
 * systems can move into Cocos components later.
 */
export class Game {
  mode: Mode = 'playing'
  time = 0
  elapsed = 0
  gold = 0
  baseHp = CONFIG.base.maxHp
  baseMaxHp = CONFIG.base.maxHp
  wave = 1
  mods: RunMods = defaultMods()
  ring: RingState = createRing()
  enemies = new Pool(makeEnemy, 48)
  bullets = new Pool(makeBullet, 96)
  particles = new Pool(makeParticle, 160)
  pickups = new Pool(makePickup, 32)
  lightnings: Lightning[] = []
  floaters: Floater[] = []
  turrets: TurretState[] = []
  choices: UpgradeChoice[] = []
  upgradePhase: 'pick' | 'offer' = 'pick'
  lastUpgrade = ''
  extraBought = false
  stats: Stats = { kills: 0, shots: 0, spawned: 0, wavesCleared: 0 }
  novaTimer = 0
  novaFlash = 0
  shake = 0
  hintLife = 7
  banner = ''
  bannerLife = 0
  bossWave = false
  spawnQueue: EnemyKind[] = []
  spawnTimer = 0
  spawnInterval = 0.6
  private plan: Pick<WavePlan, 'threatAngle' | 'spread' | 'secondThreat'> = {
    threatAngle: 0,
    spread: 1,
    secondThreat: null,
  }
  private clearTimer = -1
  private nextId = 1
  private queuedSplits: SplitRequest[] = []
  private gesture = createGesture()
  private rng: () => number

  constructor(private seed: number = (Date.now() ^ 0x9e3779b9) >>> 0) {
    this.rng = mulberry32(seed)
    this.reset(false)
  }

  reset(newRun: boolean): void {
    if (newRun) this.seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0
    this.rng = mulberry32(this.seed)
    this.enemies.drain()
    this.bullets.drain()
    this.particles.drain()
    this.pickups.drain()
    this.lightnings = []
    this.floaters = []
    this.turrets = [{ cooldown: 0.2, aim: -Math.PI / 2 }]
    this.mods = defaultMods()
    this.ring = createRing()
    this.gold = 0
    this.baseMaxHp = CONFIG.base.maxHp
    this.baseHp = this.baseMaxHp
    this.time = 0
    this.elapsed = 0
    this.stats = { kills: 0, shots: 0, spawned: 0, wavesCleared: 0 }
    this.novaTimer = 0
    this.novaFlash = 0
    this.shake = 0
    this.hintLife = 7
    this.choices = []
    this.upgradePhase = 'pick'
    this.lastUpgrade = ''
    this.extraBought = false
    this.queuedSplits = []
    this.clearTimer = -1
    this.nextId = 1
    this.gesture = createGesture()
    this.mode = 'playing'
    this.beginWave(1)
  }

  update(dt: number): void {
    const step = clamp(dt, 0, 0.05)
    this.time += step
    this.hintLife = Math.max(0, this.hintLife - step)
    this.bannerLife = Math.max(0, this.bannerLife - step)
    this.novaFlash = Math.max(0, this.novaFlash - step)
    this.shake = Math.max(0, this.shake - step * 1.7)
    for (const floater of this.floaters) {
      floater.life -= step
      floater.y += floater.vy * step
    }
    this.floaters = this.floaters.filter((floater) => floater.life > 0)
    for (const bolt of this.lightnings) bolt.life -= step
    this.lightnings = this.lightnings.filter((bolt) => bolt.life > 0)

    if (this.mode !== 'playing') return

    this.elapsed += step
    const stats = derived(this.mods)
    this.ring.dragging = this.gesture.tracking
    updateRing(this.ring, step, stats.maxSpinMul)

    this.spawnTimer -= step
    let spawnedNow = 0
    while (this.spawnQueue.length > 0 && this.spawnTimer <= 0 && spawnedNow < 6) {
      const kind = this.spawnQueue.shift()
      if (!kind) break
      const angle = rollSpawnAngle(this.plan, kind, this.rng)
      const point = spawnPosition(angle)
      spawnEnemy(this.enemies, kind, point.x, point.y, this.wave, this.nextId++, this.rng)
      this.stats.spawned += 1
      this.spawnTimer += Math.max(0.02, this.spawnInterval)
      spawnedNow += 1
    }

    updateEnemies(this.enemies, step, this.time, (enemy) => this.contact(enemy))
    if (this.mode !== 'playing') return

    updateTurrets({
      turrets: this.turrets,
      ring: this.ring,
      enemies: this.enemies.active,
      bullets: this.bullets,
      mods: this.mods,
      derived: stats,
      dt: step,
      onShot: (x, y, color) => {
        this.stats.shots += 1
        burst(this.particles, x, y, color, 3, 70, this.rng)
      },
    })

    updateBullets({
      bullets: this.bullets,
      enemies: this.enemies,
      lightnings: this.lightnings,
      dt: step,
      time: this.time,
      kill: (enemy) => this.killEnemy(enemy, true),
    })
    this.flushSplits()

    if (stats.novaDamage > 0) {
      if (this.novaTimer <= 0) this.novaTimer = stats.novaInterval
      this.novaTimer -= step
      if (this.novaTimer <= 0) {
        this.fireNova(stats.novaDamage)
        this.novaTimer = stats.novaInterval
      }
    }

    updatePickups(this.pickups, step, (value, x, y) => {
      this.gold += value
      this.floater(x, y, `+${value}`, '#ffd56a')
    })
    updateParticles(this.particles, step)

    if (this.baseHp <= 0) {
      this.enterGameOver()
      return
    }

    const idle =
      this.spawnQueue.length === 0 && this.queuedSplits.length === 0 && this.enemies.active.length === 0
    if (idle) {
      if (this.clearTimer < 0) this.clearTimer = 0.45
      else {
        this.clearTimer -= step
        if (this.clearTimer <= 0) this.enterUpgrade()
      }
    } else {
      this.clearTimer = -1
    }
  }

  onPointer(phase: 'down' | 'move' | 'up', x: number, y: number): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    if (this.mode !== 'playing') {
      if (phase === 'up') this.handleUi(x, y)
      this.gesture.tracking = false
      this.ring.dragging = false
      return
    }
    if (phase === 'down') {
      gestureDown(this.gesture, x, y, now)
      return
    }
    if (phase === 'move') {
      const sweep = gestureMove(this.gesture, x, y, now)
      if (sweep) applySweep(this.ring, sweep.dAngle, sweep.dt, derived(this.mods).maxSpinMul)
      return
    }
    const result = gestureUp(this.gesture, now)
    this.ring.dragging = false
    if (result.tap) reverseRing(this.ring, derived(this.mods).maxSpinMul)
  }

  onKey(code: string): void {
    if (code === 'KeyR' && this.mode === 'gameover') {
      this.reset(true)
      return
    }
    if (this.mode !== 'playing') return
    const spinMul = derived(this.mods).maxSpinMul
    if (code === 'Space') reverseRing(this.ring, spinMul)
    if (code === 'ArrowRight' || code === 'KeyD') nudgeSpin(this.ring, 1, spinMul)
    if (code === 'ArrowLeft' || code === 'KeyA') nudgeSpin(this.ring, -1, spinMul)
  }

  private beginWave(wave: number): void {
    const plan = buildWave(wave, this.rng)
    this.wave = wave
    this.mode = 'playing'
    this.bossWave = plan.boss
    this.spawnQueue = plan.queue
    this.spawnInterval = plan.interval
    this.spawnTimer = 0.25
    this.plan = plan
    this.clearTimer = -1
    this.upgradePhase = 'pick'
    if (wave === 1) this.ring.angle = plan.threatAngle
    this.banner = plan.boss ? '精英波次' : `第 ${wave} 波`
    this.bannerLife = 1.7
  }

  private enterUpgrade(): void {
    if (this.mode !== 'playing') return
    this.stats.wavesCleared += 1
    this.mode = 'upgrade'
    this.upgradePhase = 'pick'
    this.extraBought = false
    this.choices = rollChoices(this.mods, this.rng)
    this.banner = '选择升级'
    this.bannerLife = 0
    this.bullets.drain()
  }

  private enterGameOver(): void {
    if (this.mode === 'gameover') return
    this.mode = 'gameover'
    this.baseHp = 0
    this.banner = ''
  }

  private handleUi(worldX: number, worldY: number): void {
    const viewX = worldX + VIEW_W / 2
    const viewY = worldY + VIEW_H / 2
    if (this.mode === 'gameover') {
      if (contains(gameOverLayout().restart, viewX, viewY)) this.reset(true)
      return
    }
    if (this.mode !== 'upgrade') return
    const layout = upgradeLayout()
    if (this.upgradePhase === 'pick') {
      for (let i = 0; i < this.choices.length; i++) {
        if (contains(layout.cards[i], viewX, viewY)) this.choose(i)
      }
      return
    }
    if (contains(layout.next, viewX, viewY)) {
      this.beginWave(this.wave + 1)
      return
    }
    if (
      contains(layout.buy, viewX, viewY) &&
      this.mods.goldLevel > 0 &&
      this.gold >= CONFIG.goldCost &&
      !this.extraBought
    ) {
      this.gold -= CONFIG.goldCost
      this.extraBought = true
      this.upgradePhase = 'pick'
      this.choices = rollChoices(this.mods, this.rng)
    }
  }

  private choose(index: number): void {
    const choice = this.choices[index]
    if (!choice || this.upgradePhase !== 'pick') return
    applyUpgrade(choice.id, this.mods)
    this.lastUpgrade = choice.title
    const canExtra = this.mods.goldLevel > 0 && this.gold >= CONFIG.goldCost && !this.extraBought
    if (canExtra) this.upgradePhase = 'offer'
    else this.beginWave(this.wave + 1)
  }

  private contact(enemy: Enemy): void {
    if (!enemy.alive || this.mode !== 'playing') return
    this.baseHp -= enemy.damage
    this.shake = Math.min(1.4, this.shake + 0.55)
    this.floater(enemy.x, enemy.y, `-${enemy.damage}`, '#ff6b81')
    burst(this.particles, enemy.x, enemy.y, '#ff6b81', 8, 90, this.rng)
    this.killEnemy(enemy, false)
    if (this.baseHp <= 0) this.enterGameOver()
  }

  private killEnemy(enemy: Enemy, creditKill: boolean): void {
    if (!enemy.alive) return
    enemy.alive = false
    if (creditKill) {
      this.stats.kills += 1
      const stats = derived(this.mods)
      if (stats.healOnKill > 0) {
        this.baseHp = Math.min(this.baseMaxHp, this.baseHp + stats.healOnKill)
        this.floater(enemy.x, enemy.y - 10, `+${stats.healOnKill}`, '#9dffb0')
      }
      this.spawnGold(enemy)
    }
    if (enemy.canSplit) {
      const dist = Math.hypot(enemy.x, enemy.y) || 1
      const ox = enemy.x / dist
      const oy = enemy.y / dist
      this.queuedSplits.push({ x: enemy.x + ox * 24, y: enemy.y + oy * 24 })
    }
    burst(this.particles, enemy.x, enemy.y, enemy.color, enemy.kind === 'boss' ? 22 : 8, 140, this.rng)
    this.enemies.release(enemy)
  }

  private flushSplits(): void {
    const pending = this.queuedSplits.splice(0, this.queuedSplits.length)
    for (const split of pending) {
      const dist = Math.hypot(split.x, split.y) || 1
      const ox = split.x / dist
      const oy = split.y / dist
      const px = -oy
      const py = ox
      for (let i = 0; i < 2; i++) {
        const sign = i === 0 ? -1 : 1
        spawnSplitling(
          this.enemies,
          split.x + px * 16 * sign,
          split.y + py * 16 * sign,
          this.wave,
          this.nextId++,
          this.rng,
        )
        this.stats.spawned += 1
      }
    }
  }

  private spawnGold(enemy: Enemy): void {
    if (this.mods.goldLevel <= 0) return
    const boss = enemy.kind === 'boss'
    if (!boss && this.rng() > 0.7) return
    const pickup = this.pickups.acquire()
    pickup.x = enemy.x
    pickup.y = enemy.y
    pickup.value = boss ? 5 + this.mods.goldLevel * 2 : this.mods.goldLevel
    pickup.life = 10
  }

  private fireNova(damage: number): void {
    this.novaFlash = 0.35
    this.shake = Math.min(1.2, this.shake + 0.4)
    const snapshot = this.enemies.active.slice()
    for (const enemy of snapshot) {
      if (!enemy.alive) continue
      enemy.hp -= damage
      enemy.hitFlash = 0.12
      if (enemy.hp <= 0) this.killEnemy(enemy, true)
    }
    this.flushSplits()
    burst(this.particles, 0, 0, '#b9f6ff', 28, 260, this.rng)
  }

  private floater(x: number, y: number, text: string, color: string): void {
    this.floaters.push({ x, y, vy: -28, life: 0.7, text, color })
    if (this.floaters.length > 24) this.floaters.shift()
  }
}

/** Used by the smoke test to poke a view-space button. */
export function clickView(game: Game, viewX: number, viewY: number): void {
  const world = viewToWorld(viewX, viewY)
  game.onPointer('down', world.x, world.y)
  game.onPointer('up', world.x, world.y)
}
