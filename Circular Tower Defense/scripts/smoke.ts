import { CONFIG } from '../src/config'
import { Game, clickView } from '../src/game'
import { Pool } from '../src/systems/pool'
import { buildWave } from '../src/systems/waves'
import { mulberry32 } from '../src/rng'
import { gameOverLayout, rectCenter, upgradeLayout } from '../src/ui/layout'

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message)
}

function finiteEntities(game: Game): void {
  for (const enemy of game.enemies.active) {
    assert(Number.isFinite(enemy.x) && Number.isFinite(enemy.y) && Number.isFinite(enemy.hp), '敌人坐标或生命异常')
  }
  for (const bullet of game.bullets.active) {
    assert(Number.isFinite(bullet.x) && Number.isFinite(bullet.y), '子弹坐标异常')
  }
}

function step(game: Game, seconds: number, dt = 1 / 60): void {
  const ticks = Math.ceil(seconds / dt)
  for (let i = 0; i < ticks; i++) {
    game.update(dt)
    if (i % 30 === 0) finiteEntities(game)
  }
}

function wipeUntilUpgrade(game: Game): void {
  game.mods.damageLevel = 24
  game.mods.fireRateLevel = 12
  game.mods.rangeLevel = 10
  game.spawnInterval = 0.05
  for (let i = 0; i < 800 && game.mode === 'playing'; i++) {
    for (const enemy of game.enemies.active) enemy.hp = 0.01
    game.update(0.05)
  }
  assert(game.mode === 'upgrade', `应进入升级，实际是 ${game.mode}，波次 ${game.wave}，存活敌人 ${game.enemies.active.length}`)
}

function poolReuses(): void {
  const pool = new Pool(() => ({ alive: false, n: 0 }), 2)
  const first = pool.acquire()
  pool.acquire()
  const third = pool.acquire()
  assert(pool.created === 3, '池应在预热之外按需增长')
  pool.release(first)
  const reused = pool.acquire()
  assert(reused === first, '释放后的子弹槽应被复用')
  assert(third.alive && reused.alive, '活跃对象应标记为存活')
}

function wavesHaveBosses(): void {
  const rng = mulberry32(7)
  const wave1 = buildWave(1, rng)
  assert(!wave1.boss && wave1.queue.every((kind) => kind === 'grunt'), '第 1 波应只有步兵')
  assert(!buildWave(4, rng).boss, '第 4 波不是精英')
  const wave5 = buildWave(5, rng)
  assert(wave5.boss && wave5.queue[0] === 'boss', '第 5 波应以精英开场')
  const wave10 = buildWave(10, rng)
  assert(wave10.boss && wave10.spread > 6, '第 10 波应全方向压上')
  assert(buildWave(6, rng).secondThreat !== null, '第 6 波应出现第二进攻方向')
}

function combatLoop(): void {
  const game = new Game(42)
  game.baseHp = 5000
  game.baseMaxHp = 5000
  assert(game.mode === 'playing' && game.wave === 1, '开局应在第 1 波')
  step(game, 8)
  assert(game.stats.spawned > 0, '应生成敌人')
  assert(game.stats.shots > 0, '炮塔应自动开火')
  assert(game.bullets.created < 400, `子弹池膨胀异常：${game.bullets.created}`)
  const createdBefore = game.bullets.created
  step(game, 4)
  assert(game.bullets.created < createdBefore + 80, '持续射击应主要复用子弹对象')

  game.baseHp = 5000
  game.baseMaxHp = 5000
  wipeUntilUpgrade(game)
  assert(game.stats.wavesCleared === 1, '清波后应记 1 波')
  assert(game.choices.length === 3, '应给出 3 个升级')
  const categories = new Set(game.choices.map((choice) => choice.category))
  assert(categories.size === 3, '三选一应覆盖炮塔、效果、机制')

  const card = rectCenter(upgradeLayout().cards[0])
  clickView(game, card.x, card.y)
  assert(game.mode === 'playing' && game.wave === 2, '选择升级后应进入下一波')

  wipeUntilUpgrade(game)
  game.mods.goldLevel = 1
  game.gold = CONFIG.goldCost + 3
  const second = rectCenter(upgradeLayout().cards[1])
  clickView(game, second.x, second.y)
  assert(game.mode === 'upgrade' && game.upgradePhase === 'offer', '有金币时应能再买一次')
  const buy = rectCenter(upgradeLayout().buy)
  clickView(game, buy.x, buy.y)
  assert(game.upgradePhase === 'pick' && game.gold === 3, '购买后应扣金币并重新抽卡')
  const third = rectCenter(upgradeLayout().cards[2])
  clickView(game, third.x, third.y)
  assert(game.mode === 'playing' && game.wave === 3, '额外升级后应继续')

  game.baseHp = 0
  game.update(0.016)
  assert(game.mode === 'gameover', '基地生命归零应结束')
  assert(game.stats.wavesCleared === 2, '失败时保留已守住的波次')
  const restart = rectCenter(gameOverLayout().restart)
  clickView(game, restart.x, restart.y)
  assert(game.mode === 'playing' && game.wave === 1 && game.baseHp > 0, '再来一局应重置')
}

poolReuses()
wavesHaveBosses()
combatLoop()
console.log('smoke ok')
