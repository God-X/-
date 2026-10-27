import { CONFIG } from '../config'
import type { DerivedMods, RunMods, UpgradeCategory, UpgradeChoice, UpgradeId } from '../types'

const CATEGORY: Record<UpgradeId, UpgradeCategory> = {
  turret: '炮塔',
  fireRate: '炮塔',
  range: '炮塔',
  split: '炮塔',
  explosive: '效果',
  freeze: '效果',
  pierce: '效果',
  chain: '效果',
  spin: '机制',
  heal: '机制',
  nova: '机制',
  gold: '机制',
}

const TITLE: Record<UpgradeId, string> = {
  turret: '加装炮塔',
  fireRate: '射速强化',
  range: '射程延伸',
  split: '分裂射击',
  explosive: '爆炸弹',
  freeze: '冷冻弹',
  pierce: '穿透弹',
  chain: '连锁闪电',
  spin: '转速超载',
  heal: '击杀回复',
  nova: '脉冲震波',
  gold: '金币掉落',
}

const GROUPS: UpgradeCategory[] = ['炮塔', '效果', '机制']

export function defaultMods(): RunMods {
  return {
    turretCount: 1,
    fireRateLevel: 0,
    rangeLevel: 0,
    splitLevel: 0,
    explosiveLevel: 0,
    freezeLevel: 0,
    pierceLevel: 0,
    chainLevel: 0,
    spinLevel: 0,
    healLevel: 0,
    novaLevel: 0,
    goldLevel: 0,
    damageLevel: 0,
  }
}

export function derived(mods: RunMods): DerivedMods {
  const splitShots = mods.splitLevel <= 0 ? 1 : Math.min(5, mods.splitLevel + 2)
  return {
    fireRateMul: 1.2 ** mods.fireRateLevel,
    rangeMul: 1.15 ** mods.rangeLevel,
    splitShots,
    explosiveRadius: mods.explosiveLevel > 0 ? 42 + (mods.explosiveLevel - 1) * 14 : 0,
    freezePotency: mods.freezeLevel > 0 ? Math.min(0.72, 0.42 + (mods.freezeLevel - 1) * 0.08) : 0,
    freezeDuration: 1.3 + mods.freezeLevel * 0.15,
    pierceExtra: mods.pierceLevel * 2,
    chainJumps: mods.chainLevel > 0 ? mods.chainLevel + 1 : 0,
    maxSpinMul: 1.5 ** mods.spinLevel,
    healOnKill: mods.healLevel * 3,
    novaDamage: mods.novaLevel > 0 ? 14 + (mods.novaLevel - 1) * 8 : 0,
    novaInterval: mods.novaLevel > 0 ? Math.max(6, 10 - (mods.novaLevel - 1)) : 0,
    damageMul: 1.1 ** mods.damageLevel,
  }
}

export function shotColor(mods: RunMods): string {
  if (mods.chainLevel > 0) return '#d7b6ff'
  if (mods.explosiveLevel > 0) return '#ffb15e'
  if (mods.freezeLevel > 0) return '#8fe7ff'
  if (mods.pierceLevel > 0) return '#ffe56a'
  return '#e9fbff'
}

function detail(id: UpgradeId, mods: RunMods): string {
  switch (id) {
    case 'turret':
      return mods.turretCount < CONFIG.maxTurrets
        ? `环上炮塔 +1（当前 ${mods.turretCount}）`
        : '炮塔已满，伤害 +10%'
    case 'fireRate':
      return `射速 +20%（已强化 ${mods.fireRateLevel} 次）`
    case 'range':
      return `射程 +15%（已强化 ${mods.rangeLevel} 次）`
    case 'split':
      if (mods.splitLevel <= 0) return '一发变为 3 发扇形弹'
      if (mods.splitLevel < 3) return `分裂弹 +1（当前 ${Math.min(5, mods.splitLevel + 2)} 发）`
      return '弹数已满，伤害 +10%'
    case 'explosive':
      return mods.explosiveLevel <= 0 ? '命中时爆炸，伤害附近敌人' : '爆炸范围扩大'
    case 'freeze':
      return mods.freezeLevel <= 0 ? '命中使敌人减速' : '减速更强、持续更久'
    case 'pierce':
      return mods.pierceLevel <= 0 ? '子弹沿直线穿透敌人' : '穿透数量增加'
    case 'chain':
      return mods.chainLevel <= 0 ? '命中后跳向附近敌人' : '连锁次数增加'
    case 'spin':
      return mods.spinLevel < 4 ? '最大转速 +50%' : '转速已满，伤害 +10%'
    case 'heal':
      return `每击杀回复 ${3 * (mods.healLevel + 1)} 点生命`
    case 'nova':
      return mods.novaLevel <= 0 ? '每 10 秒释放一次全屏冲击' : '冲击更强，间隔缩短'
    case 'gold':
      return mods.goldLevel <= 0 ? '敌人掉落金币，可再买一次升级' : '金币掉落更多'
  }
}

export function describe(id: UpgradeId, mods: RunMods): UpgradeChoice {
  return {
    id,
    title: TITLE[id],
    detail: detail(id, mods),
    category: CATEGORY[id],
  }
}

function idsIn(category: UpgradeCategory): UpgradeId[] {
  return (Object.keys(CATEGORY) as UpgradeId[]).filter((id) => CATEGORY[id] === category)
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = items.slice()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}

/** One card from each category so a pick is always a real choice of turret / effect / mechanic. */
export function rollChoices(mods: RunMods, rng: () => number): UpgradeChoice[] {
  const picks: UpgradeId[] = []
  for (const category of shuffle(GROUPS, rng)) {
    const options = idsIn(category)
    picks.push(options[Math.floor(rng() * options.length)])
  }
  return picks.map((id) => describe(id, mods))
}

export function applyUpgrade(id: UpgradeId, mods: RunMods): void {
  switch (id) {
    case 'turret':
      if (mods.turretCount < CONFIG.maxTurrets) mods.turretCount += 1
      else mods.damageLevel += 1
      break
    case 'fireRate':
      mods.fireRateLevel += 1
      break
    case 'range':
      mods.rangeLevel += 1
      break
    case 'split':
      if (mods.splitLevel < 3) mods.splitLevel += 1
      else mods.damageLevel += 1
      break
    case 'explosive':
      mods.explosiveLevel += 1
      break
    case 'freeze':
      mods.freezeLevel += 1
      break
    case 'pierce':
      mods.pierceLevel += 1
      break
    case 'chain':
      mods.chainLevel += 1
      break
    case 'spin':
      if (mods.spinLevel < 4) mods.spinLevel += 1
      else mods.damageLevel += 1
      break
    case 'heal':
      mods.healLevel += 1
      break
    case 'nova':
      mods.novaLevel += 1
      break
    case 'gold':
      mods.goldLevel += 1
      break
  }
}
