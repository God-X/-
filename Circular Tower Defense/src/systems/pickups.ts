import { CONFIG } from '../config'
import type { Pickup } from '../types'
import type { Pool } from './pool'

export function makePickup(): Pickup {
  return { alive: false, x: 0, y: 0, value: 1, life: 8 }
}

export function updatePickups(pool: Pool<Pickup>, dt: number, onCollect: (value: number, x: number, y: number) => void): void {
  const list = pool.active
  for (let i = list.length - 1; i >= 0; i--) {
    const pickup = list[i]
    const dist = Math.hypot(pickup.x, pickup.y) || 0.0001
    const pull = dist < 190 ? 280 : 80
    pickup.x += (-pickup.x / dist) * pull * dt
    pickup.y += (-pickup.y / dist) * pull * dt
    pickup.life -= dt
    if (dist < CONFIG.base.radius + 12) {
      onCollect(pickup.value, pickup.x, pickup.y)
      pool.release(pickup)
    } else if (pickup.life <= 0) {
      pool.release(pickup)
    }
  }
}
