import type { EnemyKind } from './config'

export type Mode = 'playing' | 'upgrade' | 'gameover'

export type UpgradeId =
  | 'turret'
  | 'fireRate'
  | 'range'
  | 'split'
  | 'explosive'
  | 'freeze'
  | 'pierce'
  | 'chain'
  | 'spin'
  | 'heal'
  | 'nova'
  | 'gold'

export type UpgradeCategory = '炮塔' | '效果' | '机制'

export interface RunMods {
  turretCount: number
  fireRateLevel: number
  rangeLevel: number
  splitLevel: number
  explosiveLevel: number
  freezeLevel: number
  pierceLevel: number
  chainLevel: number
  spinLevel: number
  healLevel: number
  novaLevel: number
  goldLevel: number
  damageLevel: number
}

export interface UpgradeChoice {
  id: UpgradeId
  title: string
  detail: string
  category: UpgradeCategory
}

export interface DerivedMods {
  fireRateMul: number
  rangeMul: number
  splitShots: number
  explosiveRadius: number
  freezePotency: number
  freezeDuration: number
  pierceExtra: number
  chainJumps: number
  maxSpinMul: number
  healOnKill: number
  novaDamage: number
  novaInterval: number
  damageMul: number
}

export interface Enemy {
  alive: boolean
  id: number
  kind: EnemyKind
  x: number
  y: number
  hp: number
  maxHp: number
  speed: number
  radius: number
  damage: number
  color: string
  canSplit: boolean
  wobblePhase: number
  slowUntil: number
  slowFactor: number
  hitFlash: number
}

export interface Bullet {
  alive: boolean
  x: number
  y: number
  vx: number
  vy: number
  damage: number
  radius: number
  life: number
  hitsLeft: number
  explosiveRadius: number
  freezePotency: number
  freezeDuration: number
  chainJumps: number
  color: string
  hitIds: number[]
}

export interface Particle {
  alive: boolean
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  radius: number
  color: string
}

export interface Pickup {
  alive: boolean
  x: number
  y: number
  value: number
  life: number
}

export interface Lightning {
  x1: number
  y1: number
  x2: number
  y2: number
  life: number
}

export interface Floater {
  x: number
  y: number
  vy: number
  life: number
  text: string
  color: string
}

export interface TurretState {
  cooldown: number
  aim: number
}

export interface RingState {
  angle: number
  spin: number
  direction: 1 | -1
  dragging: boolean
  /** Finger already applied this frame's angle delta. */
  skipIntegrate: boolean
}

export interface Stats {
  kills: number
  shots: number
  spawned: number
  wavesCleared: number
}
