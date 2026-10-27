import { CONFIG } from '../config'
import { lerpAngle } from '../math'
import type { Bullet, Enemy, RingState, RunMods, TurretState } from '../types'
import type { DerivedMods } from '../types'
import type { Pool } from './pool'
import { shotColor } from './upgrades'

export function nearestEnemy(enemies: readonly Enemy[], x: number, y: number, range: number): Enemy | null {
  let best: Enemy | null = null
  let bestDist = Infinity
  for (const enemy of enemies) {
    if (!enemy.alive) continue
    const dx = enemy.x - x
    const dy = enemy.y - y
    const dist = dx * dx + dy * dy
    const reach = range + enemy.radius
    if (dist <= reach * reach && dist < bestDist) {
      bestDist = dist
      best = enemy
    }
  }
  return best
}

export function turretPlacement(ring: RingState, index: number, count: number): { x: number; y: number; angle: number } {
  const angle = ring.angle + (index * Math.PI * 2) / count
  return {
    angle,
    x: Math.cos(angle) * CONFIG.ring.radius,
    y: Math.sin(angle) * CONFIG.ring.radius,
  }
}

function makeBullet(): Bullet {
  return {
    alive: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    damage: 1,
    radius: CONFIG.bullet.radius,
    life: 1,
    hitsLeft: 1,
    explosiveRadius: 0,
    freezePotency: 0,
    freezeDuration: 0,
    chainJumps: 0,
    color: '#fff',
    hitIds: [],
  }
}

export { makeBullet }

export function updateTurrets(opts: {
  turrets: TurretState[]
  ring: RingState
  enemies: readonly Enemy[]
  bullets: Pool<Bullet>
  mods: RunMods
  derived: DerivedMods
  dt: number
  onShot: (x: number, y: number, color: string) => void
}): void {
  const count = Math.max(1, opts.mods.turretCount)
  while (opts.turrets.length < count) {
    opts.turrets.push({ cooldown: 0.15, aim: opts.ring.angle })
  }
  const range = CONFIG.turret.range * opts.derived.rangeMul
  const fireRate = CONFIG.turret.fireRate * opts.derived.fireRateMul
  const cooldown = 1 / fireRate
  const damage = CONFIG.turret.damage * opts.derived.damageMul
  const color = shotColor(opts.mods)
  const shots = opts.derived.splitShots
  const holdFire = opts.bullets.active.length > 220

  for (let i = 0; i < count; i++) {
    const turret = opts.turrets[i]
    const place = turretPlacement(opts.ring, i, count)
    const target = nearestEnemy(opts.enemies, place.x, place.y, range)
    const desired = target ? Math.atan2(target.y - place.y, target.x - place.x) : place.angle
    turret.aim = lerpAngle(turret.aim, desired, 1 - Math.exp(-14 * opts.dt))
    turret.cooldown -= opts.dt
    if (holdFire || !target || turret.cooldown > 0) continue
    turret.cooldown = cooldown
    const gap = shots === 1 ? 0 : 0.15
    const mid = (shots - 1) / 2
    for (let s = 0; s < shots; s++) {
      const aim = turret.aim + (s - mid) * gap
      const muzzle = CONFIG.turret.barrel
      const bullet = opts.bullets.acquire()
      bullet.x = place.x + Math.cos(aim) * muzzle
      bullet.y = place.y + Math.sin(aim) * muzzle
      bullet.vx = Math.cos(aim) * CONFIG.bullet.speed
      bullet.vy = Math.sin(aim) * CONFIG.bullet.speed
      bullet.damage = damage
      bullet.radius = CONFIG.bullet.radius
      bullet.life = CONFIG.bullet.life
      bullet.hitsLeft = 1 + opts.derived.pierceExtra
      bullet.explosiveRadius = opts.derived.explosiveRadius
      bullet.freezePotency = opts.derived.freezePotency
      bullet.freezeDuration = opts.derived.freezeDuration
      bullet.chainJumps = opts.derived.chainJumps
      bullet.color = color
      bullet.hitIds.length = 0
    }
    opts.onShot(place.x, place.y, color)
  }
}
