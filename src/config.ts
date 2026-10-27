export const VIEW_W = 480
export const VIEW_H = 800

export const CONFIG = {
  base: {
    radius: 32,
    maxHp: 100,
  },
  ring: {
    radius: 128,
    cruise: 0.42,
    maxSpin: 4.4,
  },
  turret: {
    radius: 12,
    barrel: 22,
    fireRate: 3,
    range: 210,
    damage: 9,
  },
  bullet: {
    speed: 700,
    radius: 4,
    life: 1.05,
  },
  chainRange: 118,
  goldCost: 12,
  maxTurrets: 8,
}

export type EnemyKind = 'grunt' | 'fast' | 'tank' | 'splitter' | 'flyer' | 'boss'

export interface EnemyArchetype {
  hp: number
  speed: number
  damage: number
  radius: number
  color: string
}

export const ENEMIES: Record<EnemyKind, EnemyArchetype> = {
  grunt: { hp: 18, speed: 64, damage: 8, radius: 13, color: '#ff4d6d' },
  fast: { hp: 9, speed: 118, damage: 6, radius: 10, color: '#ffe14a' },
  tank: { hp: 46, speed: 40, damage: 14, radius: 20, color: '#8d7bff' },
  splitter: { hp: 22, speed: 62, damage: 9, radius: 15, color: '#ff8a3d' },
  flyer: { hp: 12, speed: 96, damage: 7, radius: 11, color: '#49e7ff' },
  boss: { hp: 160, speed: 30, damage: 22, radius: 30, color: '#ff3ec8' },
}

export function hpScale(wave: number): number {
  return 1 + (wave - 1) * 0.14
}

export function speedScale(wave: number): number {
  return 1 + (wave - 1) * 0.035
}
