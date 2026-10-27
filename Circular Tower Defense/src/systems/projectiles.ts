import { CONFIG, VIEW_H, VIEW_W } from '../config'
import type { Bullet, Enemy, Lightning } from '../types'
import type { Pool } from './pool'

export function damageEnemy(enemy: Enemy, amount: number, kill: (enemy: Enemy) => void): void {
  if (!enemy.alive || amount <= 0) return
  enemy.hp -= amount
  enemy.hitFlash = 0.09
  if (enemy.hp <= 0) kill(enemy)
}

function applyFreeze(enemy: Enemy, potency: number, duration: number, time: number): void {
  if (potency <= 0) return
  enemy.slowFactor = Math.min(enemy.slowFactor, 1 - potency)
  enemy.slowUntil = Math.max(enemy.slowUntil, time + duration)
}

function chainFrom(
  origin: Enemy,
  jumps: number,
  damage: number,
  time: number,
  enemies: readonly Enemy[],
  lightnings: Lightning[],
  kill: (enemy: Enemy) => void,
  visited: Set<number>,
  freezePotency: number,
  freezeDuration: number,
): void {
  const roster = enemies.slice()
  let current = origin
  let remaining = jumps
  let nextDamage = damage * 0.65
  while (remaining > 0) {
    let best: Enemy | null = null
    let bestDist = CONFIG.chainRange * CONFIG.chainRange
    for (const enemy of roster) {
      if (!enemy.alive || visited.has(enemy.id)) continue
      const dx = enemy.x - current.x
      const dy = enemy.y - current.y
      const dist = dx * dx + dy * dy
      if (dist <= bestDist) {
        bestDist = dist
        best = enemy
      }
    }
    if (!best) return
    visited.add(best.id)
    lightnings.push({
      x1: current.x,
      y1: current.y,
      x2: best.x,
      y2: best.y,
      life: 0.14,
    })
    applyFreeze(best, freezePotency, freezeDuration, time)
    damageEnemy(best, nextDamage, kill)
    current = best
    nextDamage *= 0.7
    remaining -= 1
  }
}

export function updateBullets(opts: {
  bullets: Pool<Bullet>
  enemies: Pool<Enemy>
  lightnings: Lightning[]
  dt: number
  time: number
  kill: (enemy: Enemy) => void
}): void {
  const list = opts.bullets.active
  const limitX = VIEW_W / 2 + 80
  const limitY = VIEW_H / 2 + 80
  for (let i = list.length - 1; i >= 0; i--) {
    const bullet = list[i]
    bullet.life -= opts.dt
    bullet.x += bullet.vx * opts.dt
    bullet.y += bullet.vy * opts.dt
    if (bullet.life <= 0 || Math.abs(bullet.x) > limitX || Math.abs(bullet.y) > limitY) {
      opts.bullets.release(bullet)
      continue
    }

    const overlaps: { enemy: Enemy; dist: number }[] = []
    for (const enemy of opts.enemies.active) {
      if (!enemy.alive || bullet.hitIds.includes(enemy.id)) continue
      const dx = enemy.x - bullet.x
      const dy = enemy.y - bullet.y
      const dist = Math.hypot(dx, dy)
      if (dist <= bullet.radius + enemy.radius) overlaps.push({ enemy, dist })
    }
    overlaps.sort((a, b) => a.dist - b.dist)

    for (const hit of overlaps) {
      if (!bullet.alive || !hit.enemy.alive) continue
      if (bullet.hitIds.includes(hit.enemy.id)) continue
      bullet.hitIds.push(hit.enemy.id)
      damageEnemy(hit.enemy, bullet.damage, opts.kill)
      applyFreeze(hit.enemy, bullet.freezePotency, bullet.freezeDuration, opts.time)
      if (bullet.explosiveRadius > 0) {
        const snapshot = opts.enemies.active.slice()
        for (const other of snapshot) {
          if (!other.alive || other.id === hit.enemy.id) continue
          const dx = other.x - hit.enemy.x
          const dy = other.y - hit.enemy.y
          if (dx * dx + dy * dy <= (bullet.explosiveRadius + other.radius) ** 2) {
            damageEnemy(other, bullet.damage * 0.55, opts.kill)
          }
        }
      }
      if (bullet.chainJumps > 0) {
        const visited = new Set<number>([hit.enemy.id])
        chainFrom(
          hit.enemy,
          bullet.chainJumps,
          bullet.damage,
          opts.time,
          opts.enemies.active,
          opts.lightnings,
          opts.kill,
          visited,
          bullet.freezePotency,
          bullet.freezeDuration,
        )
      }
      bullet.hitsLeft -= 1
      if (bullet.hitsLeft <= 0) {
        opts.bullets.release(bullet)
        break
      }
    }
  }
}
