import { Game } from './game'
import { fitCamera, screenToWorld } from './render/camera'
import { draw } from './render/draw'

const canvasNode = document.querySelector('#game')
if (!(canvasNode instanceof HTMLCanvasElement)) throw new Error('缺少画布')
const canvas: HTMLCanvasElement = canvasNode
const context = canvas.getContext('2d')
if (!context) throw new Error('无法创建 2D 上下文')
const ctx: CanvasRenderingContext2D = context

const game = new Game()

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr))
  canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr))
}

function eventPoint(event: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  const px = (event.clientX - rect.left) * (canvas.width / rect.width)
  const py = (event.clientY - rect.top) * (canvas.height / rect.height)
  return screenToWorld(px, py, fitCamera(canvas.width, canvas.height))
}

let pressing = false

canvas.addEventListener('pointerdown', (event) => {
  event.preventDefault()
  pressing = true
  const point = eventPoint(event)
  game.onPointer('down', point.x, point.y)
})

canvas.addEventListener('pointermove', (event) => {
  if (!pressing) return
  const point = eventPoint(event)
  game.onPointer('move', point.x, point.y)
})

window.addEventListener('pointerup', (event) => {
  if (!pressing && event.pointerType === 'mouse') return
  pressing = false
  const point = eventPoint(event)
  game.onPointer('up', point.x, point.y)
})

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' || event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
    event.preventDefault()
  }
  game.onKey(event.code)
})

window.addEventListener('resize', resize)
canvas.addEventListener('contextmenu', (event) => event.preventDefault())
resize()

let last = performance.now()
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  game.update(dt)
  draw(ctx, game, canvas.width, canvas.height)
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
