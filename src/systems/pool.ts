/**
 * Fixed-ish object pool. Bullets, enemies, particles, and pickups all reuse slots
 * so a busy wave does not allocate a new object per projectile.
 */
export class Pool<T extends { alive: boolean }> {
  private readonly free: T[] = []
  readonly active: T[] = []
  created = 0

  constructor(
    private readonly factory: () => T,
    prewarm: number,
  ) {
    for (let i = 0; i < prewarm; i++) {
      this.created += 1
      this.free.push(factory())
    }
  }

  acquire(): T {
    let item = this.free.pop()
    if (!item) {
      this.created += 1
      item = this.factory()
    }
    item.alive = true
    this.active.push(item)
    return item
  }

  release(item: T): void {
    const index = this.active.indexOf(item)
    if (index < 0) return
    this.active.splice(index, 1)
    item.alive = false
    this.free.push(item)
  }

  drain(): void {
    while (this.active.length > 0) {
      this.release(this.active[this.active.length - 1])
    }
  }
}
