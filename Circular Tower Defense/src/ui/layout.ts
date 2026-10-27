import { VIEW_H, VIEW_W } from '../config'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface UpgradeLayout {
  cards: Rect[]
  next: Rect
  buy: Rect
}

export function upgradeLayout(): UpgradeLayout {
  const w = 408
  const h = 96
  const x = (VIEW_W - w) / 2
  const y0 = 268
  const gap = 14
  return {
    cards: [0, 1, 2].map((i) => ({ x, y: y0 + i * (h + gap), w, h })),
    next: { x, y: 620, w: 190, h: 54 },
    buy: { x: x + 218, y: 620, w: 190, h: 54 },
  }
}

export function gameOverLayout(): { restart: Rect } {
  return {
    restart: { x: (VIEW_W - 240) / 2, y: 500, w: 240, h: 58 },
  }
}

export function contains(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && y >= rect.y && x <= rect.x + rect.w && y <= rect.y + rect.h
}

export function rectCenter(rect: Rect): { x: number; y: number } {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }
}

/** View origin is top-left. World origin is the base at the view center. */
export function viewToWorld(vx: number, vy: number): { x: number; y: number } {
  return { x: vx - VIEW_W / 2, y: vy - VIEW_H / 2 }
}
