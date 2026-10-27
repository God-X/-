export const TAU = Math.PI * 2

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export function wrapAngle(d: number): number {
  while (d > Math.PI) d -= TAU
  while (d < -Math.PI) d += TAU
  return d
}

export function hypot(x: number, y: number): number {
  return Math.hypot(x, y)
}

export function lerpAngle(current: number, target: number, t: number): number {
  return current + wrapAngle(target - current) * t
}
