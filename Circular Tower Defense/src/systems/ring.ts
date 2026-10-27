import { CONFIG } from '../config'
import { clamp } from '../math'
import type { RingState } from '../types'

export function createRing(): RingState {
  return {
    angle: -Math.PI / 2,
    spin: CONFIG.ring.cruise,
    direction: 1,
    dragging: false,
    skipIntegrate: false,
  }
}

export function maxSpin(spinMul: number): number {
  return CONFIG.ring.maxSpin * spinMul
}

/** Direct finger sweep. Angle follows the gesture; spin keeps the flick. */
export function applySweep(ring: RingState, dAngle: number, dt: number, spinMul: number): void {
  if (Math.abs(dAngle) < 0.0008) return
  const cap = maxSpin(spinMul)
  ring.angle += dAngle
  ring.spin = clamp(dAngle / Math.max(dt, 1 / 120), -cap, cap)
  ring.direction = ring.spin >= 0 ? 1 : -1
  ring.dragging = true
  ring.skipIntegrate = true
}

export function reverseRing(ring: RingState, spinMul: number): void {
  const cap = maxSpin(spinMul)
  const magnitude = Math.max(CONFIG.ring.cruise * 1.35, Math.abs(ring.spin))
  const sign: 1 | -1 = ring.spin === 0 ? (ring.direction === 1 ? -1 : 1) : ring.spin > 0 ? -1 : 1
  ring.spin = clamp(sign * magnitude, -cap, cap)
  ring.direction = ring.spin >= 0 ? 1 : -1
}

/** Keyboard / tap-and-hold nudge. Speed sticks until the player reverses or drags. */
export function nudgeSpin(ring: RingState, direction: 1 | -1, spinMul: number): void {
  const cap = maxSpin(spinMul)
  const next = ring.spin + direction * cap * 0.38
  ring.spin = clamp(next, -cap, cap)
  if (Math.abs(ring.spin) < CONFIG.ring.cruise) {
    ring.spin = direction * CONFIG.ring.cruise
  }
  ring.direction = ring.spin >= 0 ? 1 : -1
}

export function updateRing(ring: RingState, dt: number, spinMul: number): void {
  const cap = maxSpin(spinMul)
  ring.spin = clamp(ring.spin, -cap, cap)
  if (Math.abs(ring.spin) < CONFIG.ring.cruise) {
    ring.spin = ring.direction * CONFIG.ring.cruise
  }
  if (ring.skipIntegrate) ring.skipIntegrate = false
  else ring.angle += ring.spin * dt
}
