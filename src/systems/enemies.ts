import { CONFIG, ENEMIES, hpScale, speedScale, type EnemyKind } from '../config'
import type { Enemy } from '../types'
import type { Pool } from './pool'

export function makeEnemy(): Enemy {
  return {
    alive: false,
    id: 0,
    kind: 'grunt',
    x: 0,
    y: 0,
    hp: 1,
    maxHp: 1,
    speed: 1,
    radius: 10,
    damage: 1,
    color: '#fff',
    canSplit: false,
    wobblePhase: 0,
    slowUntil: 0,
    slowFactor: 1,
    hitFlash: 0,
  }
}

export function spawnEnemy(
  pool: Pool<Enemy>,
  kind: EnemyKind,
  x: number,
  y: number,
  wave: number,
  id: number,
  rng: () => number,
): Enemy {
  const archetype = ENEMIES[kind]
  const enemy = pool.acquire()
  const scaledHp = Math.max(1, Math.round(archetype.hp * hpScale(wave)))
  enemy.id = id
  enemy.kind = kind
  enemy.x = x
  enemy.y = y
  enemy.maxHp = scaledHp
  enemy.hp = scaledHp
  enemy.speed = archetype.speed * (kind === 'boss' ? 1 : speedScale(wave))
  enemy.radius = archetype.radius
  enemy.damage = archetype.damage
  enemy.color = archetype.color
  enemy.canSplit = kind === 'splitter'
  enemy.wobblePhase = rng() * Math.PI * 2
  enemy.slowUntil = 0
  enemy.slowFactor = 1
  enemy.hitFlash = 0
  return enemy
}

/** Minions from a splitter. They do not split again. */
export function spawnSplitling(
  pool: Pool<Enemy>,
  x: number,
  y: number,
  wave: number,
  id: number,
  rng: () => number,
): Enemy {
  const enemy = spawnEnemy(pool, 'grunt', x, y, wave, id, rng)
  enemy.canSplit = false
  enemy.maxHp = Math.max(6, Math.round(8 * hpScale(wave)))
  enemy.hp = enemy.maxHp
  enemy.speed = 100 * speedScale(wave)
  enemy.radius = 9
  enemy.damage = 5
  enemy.color = '#ffb0c4'
  return enemy
}

export function updateEnemies(
  pool: Pool<Enemy>,
  dt: number,
  time: number,
  onContact: (enemy: Enemy) => void,
): void {
  const list = pool.active
  for (let i = list.length - 1; i >= 0; i--) {
    const enemy = list[i]
    if (!enemy.alive) continue
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt)
    const dist = Math.hypot(enemy.x, enemy.y) || 0.0001
    const dx = -enemy.x / dist
    const dy = -enemy.y / dist
    let speed = enemy.speed
    if (time < enemy.slowUntil) speed *= enemy.slowFactor
    if (enemy.kind === 'flyer') {
      const wobble = Math.sin(time * 5.2 + enemy.wobblePhase) * 70
      const px = -dy
      const py = dx
      enemy.x += (dx * speed + px * wobble) * dt
      enemy.y += (dy * speed + py * wobble) * dt
    } else {
      enemy.x += dx * speed * dt
      enemy.y += dy * speed * dt
    }
    const next = Math.hypot(enemy.x, enemy.y)
    if (next <= CONFIG.base.radius + enemy.radius * 0.7) onContact(enemy)
  }
}
