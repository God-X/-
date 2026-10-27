import type { Pool } from './pool'
import type { Particle } from '../types'

export function makeParticle(): Particle {
  return {
    alive: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 1,
    radius: 2,
    color: '#fff',
  }
}

export function burst(
  pool: Pool<Particle>,
  x: number,
  y: number,
  color: string,
  count: number,
  speed: number,
  rng: () => number,
): void {
  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2
    const mag = speed * (0.35 + rng() * 0.65)
    const particle = pool.acquire()
    particle.x = x
    particle.y = y
    particle.vx = Math.cos(angle) * mag
    particle.vy = Math.sin(angle) * mag
    particle.maxLife = 0.22 + rng() * 0.32
    particle.life = particle.maxLife
    particle.radius = 1.4 + rng() * 2.2
    particle.color = color
  }
}

export function updateParticles(pool: Pool<Particle>, dt: number): void {
  const list = pool.active
  for (let i = list.length - 1; i >= 0; i--) {
    const particle = list[i]
    particle.life -= dt
    particle.x += particle.vx * dt
    particle.y += particle.vy * dt
    particle.vx *= 0.98
    particle.vy *= 0.98
    if (particle.life <= 0) pool.release(particle)
  }
}
