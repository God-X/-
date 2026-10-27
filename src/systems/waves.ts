import { VIEW_H, VIEW_W, type EnemyKind } from '../config'

export interface WavePlan {
  queue: EnemyKind[]
  interval: number
  threatAngle: number
  spread: number
  /** Later waves open a second approach so the ring has to turn. */
  secondThreat: number | null
  boss: boolean
}

function unlocked(wave: number): EnemyKind[] {
  const types: EnemyKind[] = ['grunt', 'grunt']
  if (wave >= 2) types.push('fast', 'grunt')
  if (wave >= 3) types.push('tank', 'grunt')
  if (wave >= 4) types.push('splitter', 'fast')
  if (wave >= 6) types.push('flyer', 'fast')
  if (wave >= 8) types.push('tank', 'splitter', 'flyer')
  return types
}

export function buildWave(wave: number, rng: () => number): WavePlan {
  const boss = wave % 5 === 0
  const spread = boss ? Math.PI * 2 : Math.min(Math.PI * 1.7, 0.5 + wave * 0.18)
  const threatAngle = rng() * Math.PI * 2
  const secondThreat = wave >= 6 ? threatAngle + Math.PI + (rng() - 0.5) * 0.6 : null
  const count = boss ? 4 + Math.floor(wave * 0.6) : 8 + wave * 2
  const pool = unlocked(wave)
  const queue: EnemyKind[] = []
  if (boss) queue.push('boss')
  for (let i = 0; i < count; i++) {
    queue.push(pool[Math.floor(rng() * pool.length)])
  }
  const interval = Math.max(0.34, 0.78 - wave * 0.025)
  return { queue, interval, threatAngle, spread, secondThreat, boss }
}

/** Ray from the origin to the view rectangle, just outside the screen. */
export function spawnPosition(angle: number): { x: number; y: number } {
  const hw = VIEW_W / 2
  const hh = VIEW_H / 2
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const tx = Math.abs(dx) > 1e-5 ? hw / Math.abs(dx) : Infinity
  const ty = Math.abs(dy) > 1e-5 ? hh / Math.abs(dy) : Infinity
  const t = Math.min(tx, ty) + 28
  return { x: dx * t, y: dy * t }
}

export function rollSpawnAngle(plan: Pick<WavePlan, 'threatAngle' | 'spread' | 'secondThreat'>, kind: EnemyKind, rng: () => number): number {
  if (kind === 'boss') return plan.threatAngle
  let base = plan.threatAngle
  if (plan.secondThreat !== null && rng() < 0.42) base = plan.secondThreat
  return base + (rng() - 0.5) * plan.spread
}
