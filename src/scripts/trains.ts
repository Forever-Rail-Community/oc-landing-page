// Trains on the rails drawing: in the "Watch it run" picture and across the opening. Each runs on a track of its own
// (a path traced off the drawing's rails by tools/trace-rail.py), so none ever meet, and moves like a train: it
// pulls away gently, runs, eases to a stop at its station, waits, and goes on to the end of the line, then appears
// again at the start after a while. It's drawn like a locomotive on a live map: a glow, the locomotive, and its cars
// behind, each turned to follow the curve, with the train's symbol beside it. A picture can draw them larger
// (data-train-scale on its svg), and give its trains one cycle (data-cycle) so they keep the same spacing.
// Signals and switches along their tracks answer to them (src/scripts/wayside.ts).
// Paused while off screen; with reduced motion, the trains stand at their stations.
import { startWayside } from './wayside'

export const SVG = 'http://www.w3.org/2000/svg'
const FADE = 0.05 // of the run, at each end
const OFF_S = 4 // between leaving the picture and appearing again
const LOCO = { length: 16, width: 7 }
const CAR = { length: 11, width: 5.5 }
const GAP = 2.5 // between cars

interface Leg { from: number; to: number; start: number; end: number } // along the track, 0 to 1, and when
export interface Train {
  g: SVGGElement
  track: SVGPathElement
  length: number
  reverse: boolean
  legs: Leg[]
  cycle: number
  offset: number
  glow: SVGCircleElement
  label: SVGTextElement
  vehicles: { el: SVGRectElement; back: number }[] // how far the middle of each sits behind the front of the train
  scale: number
  below: boolean // its symbol goes under it, clear of trains passing the other way
  // Where it is now, for the signals and switches: its front and rear as distances along its run, whether it's in the
  // picture, where it will next stop (as a distance along its run), and how long it has left to wait if it's stopped
  // there.
  front: number
  rear: number
  shown: boolean
  stopsAt: number
  waiting: number
}

// Smooth starts and stops.
const ease = (t: number) => t * t * (3 - 2 * t)

function schedule(length: number, speed: number, stops: number[], dwell: number, cycle: number): { legs: Leg[]; cycle: number } {
  const points = [0, ...stops, 1]
  const legs: Leg[] = []
  let time = 0
  for (let i = 0; i < points.length - 1; i++) {
    const run = (((points[i + 1]! - points[i]!) * length) / speed) * 1.5 // easing in and out takes longer
    legs.push({ from: points[i]!, to: points[i + 1]!, start: time, end: time + run })
    time += run + (i < points.length - 2 ? dwell : 0)
  }
  return { legs, cycle: Math.max(cycle, time + OFF_S) }
}

// Where along its track a train is at time t into its cycle, 0 to 1 (1 means it's gone off the picture), where it will
// next stop, and how long it has left to wait if it's stopped there.
interface Moment { at: number; stopsAt: number; waiting: number }
function along(train: Train, t: number): Moment {
  const now = ((t % train.cycle) + train.cycle) % train.cycle
  for (const leg of train.legs) {
    if (now < leg.start) return { at: leg.from, stopsAt: leg.from, waiting: leg.start - now }
    if (now <= leg.end) return { at: leg.from + (leg.to - leg.from) * ease((now - leg.start) / (leg.end - leg.start)), stopsAt: leg.to, waiting: 0 }
  }
  return { at: 1, stopsAt: 1, waiting: 0 }
}

export function make<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string | number>, parent: Element) {
  const el = document.createElementNS(SVG, name)
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value))
  parent.append(el)
  return el
}

function build(shot: SVGSVGElement, g: SVGGElement, scale: number): Train {
  const track = shot.querySelector<SVGPathElement>(`#${g.dataset.track}`)!
  const length = track.getTotalLength()
  const stops = (g.dataset.stops ?? '').split(' ').filter(Boolean).map(Number)
  const loco = { length: LOCO.length * scale, width: LOCO.width * scale }
  const car = { length: CAR.length * scale, width: CAR.width * scale }
  const glow = make('circle', { class: 'glow', r: 28 * scale }, g)
  const vehicles: Train['vehicles'] = []
  let back = loco.length / 2
  for (let i = 0; i < Number(g.dataset.cars); i++) {
    back += (i ? car.length : (loco.length + car.length) / 2) + GAP * scale
    vehicles.push({ el: make('rect', { class: 'car', x: -car.length / 2, y: -car.width / 2, width: car.length, height: car.width, rx: 1.5 * scale }, g), back })
  }
  vehicles.unshift({ el: make('rect', { class: 'loco', x: -loco.length / 2, y: -loco.width / 2, width: loco.length, height: loco.width, rx: 2 * scale }, g), back: loco.length / 2 })
  const label = make('text', { class: 'symbol', 'text-anchor': 'middle', 'font-size': 17 * scale }, g)
  label.textContent = g.dataset.symbol ?? ''
  return {
    g, track, length, glow, label, vehicles, scale,
    below: g.dataset.label === 'below',
    reverse: g.dataset.reverse === 'true',
    offset: Number(g.dataset.offset ?? 0),
    front: 0, rear: 0, shown: false, stopsAt: 1, waiting: 0,
    ...schedule(length, Number(g.dataset.speed), stops, Number(g.dataset.dwell ?? 4), Number(shot.dataset.cycle ?? 0))
  }
}

function draw(train: Train, { at, stopsAt, waiting }: Moment) {
  // `at` runs 0 to 1 in the direction of travel; the front of the train is that far along.
  const way = train.reverse ? -1 : 1
  const front = (train.reverse ? 1 - at : at) * train.length
  train.front = at * train.length
  train.rear = train.front - train.vehicles[train.vehicles.length - 1]!.back - CAR.length * train.scale / 2
  train.shown = at < 1
  train.stopsAt = stopsAt * train.length
  train.waiting = waiting
  const point = (s: number) => train.track.getPointAtLength(Math.min(train.length, Math.max(0, s)))
  for (const { el, back } of train.vehicles) {
    const s = front - way * back
    const a = point(s - way * 3), b = point(s + way * 3), p = point(s)
    const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
    el.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${angle.toFixed(1)})`)
  }
  const head = point(front - way * train.vehicles[0]!.back)
  train.glow.setAttribute('cx', head.x.toFixed(1))
  train.glow.setAttribute('cy', head.y.toFixed(1))
  train.label.setAttribute('x', head.x.toFixed(1))
  train.label.setAttribute('y', (head.y + (train.below ? 27 : -16) * train.scale).toFixed(1))
  const shown = at >= 1 ? 0 : Math.min(1, at / FADE, (1 - at) / FADE)
  train.g.style.opacity = String(Math.max(0, shown))
}

export function startTrains(shot: SVGSVGElement) {
  const scale = Number(shot.dataset.trainScale ?? 1)
  const trains = [...shot.querySelectorAll<SVGGElement>('.train[data-track]')].map((g) => build(shot, g, scale))
  const wayside = startWayside(shot, trains, scale)

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    trains.forEach((train) => { const at = train.legs[0]!.to; draw(train, { at, stopsAt: at, waiting: Infinity }) })
    wayside()
    return
  }
  let frame = 0
  let started = 0
  const tick = (now: number) => {
    started ||= now
    const t = (now - started) / 1000
    trains.forEach((train) => {
      draw(train, along(train, t + train.offset))
    })
    wayside()
    frame = requestAnimationFrame(tick)
  }
  new IntersectionObserver(([entry]) => {
    cancelAnimationFrame(frame)
    if (entry?.isIntersecting) frame = requestAnimationFrame(tick)
  }).observe(shot)
}
