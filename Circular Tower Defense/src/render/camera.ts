import { VIEW_H, VIEW_W } from '../config'

export interface Camera {
  scale: number
  ox: number
  oy: number
}

export function fitCamera(pixelW: number, pixelH: number): Camera {
  const scale = Math.min(pixelW / VIEW_W, pixelH / VIEW_H)
  return {
    scale,
    ox: (pixelW - VIEW_W * scale) / 2,
    oy: (pixelH - VIEW_H * scale) / 2,
  }
}

export function screenToWorld(px: number, py: number, camera: Camera): { x: number; y: number } {
  const viewX = (px - camera.ox) / camera.scale
  const viewY = (py - camera.oy) / camera.scale
  return { x: viewX - VIEW_W / 2, y: viewY - VIEW_H / 2 }
}
