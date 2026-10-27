import { wrapAngle } from '../math'

export interface PointerGesture {
  tracking: boolean
  lastAngle: number
  lastMs: number
  lastX: number
  lastY: number
  moved: number
  downMs: number
}

export function createGesture(): PointerGesture {
  return {
    tracking: false,
    lastAngle: 0,
    lastMs: 0,
    lastX: 0,
    lastY: 0,
    moved: 0,
    downMs: 0,
  }
}

export function gestureDown(gesture: PointerGesture, x: number, y: number, now: number): void {
  gesture.tracking = true
  gesture.lastAngle = Math.atan2(y, x)
  gesture.lastMs = now
  gesture.lastX = x
  gesture.lastY = y
  gesture.moved = 0
  gesture.downMs = now
}

/** Returns a sweep when the finger is far enough from the base to define an angle. */
export function gestureMove(
  gesture: PointerGesture,
  x: number,
  y: number,
  now: number,
): { dAngle: number; dt: number } | null {
  if (!gesture.tracking) return null
  gesture.moved += Math.hypot(x - gesture.lastX, y - gesture.lastY)
  const angle = Math.atan2(y, x)
  const dt = Math.max(0.008, (now - gesture.lastMs) / 1000)
  const dAngle = wrapAngle(angle - gesture.lastAngle)
  gesture.lastAngle = angle
  gesture.lastMs = now
  gesture.lastX = x
  gesture.lastY = y
  if (Math.hypot(x, y) < 28) return null
  return { dAngle, dt }
}

export function gestureUp(gesture: PointerGesture, now: number): { tap: boolean } {
  const tap = gesture.tracking && gesture.moved < 22 && now - gesture.downMs < 300
  gesture.tracking = false
  return { tap }
}
