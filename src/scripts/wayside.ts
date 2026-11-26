// Signals and switches beside the trains' tracks (src/scripts/trains.ts), answering to the trains as a dispatcher's
// map would show them.
//  - A signal (<g class="signal" data-track data-at data-side>) stands beside its track at `at`, a fraction of the run
//    in the direction of travel, on the side named (above or below). It shows red while a train is in the block just
//    past it, or is waiting at the station just short of it; yellow while a train is in the block after that; and
//    green otherwise. So a train holds at a red signal and it clears just before the train pulls away.
//  - Switches (<g class="switches" data-points="x,y x,y ...">) sit where rails branch in the drawing (found by
//    tools/find-switches.py). As a train comes up to a switch on its track, the switch lights its route.
import { make, type Train } from './trains'

const BLOCK = 120 // drawing units
const HOLD_S = 1.2 // the station signal clears this long before the train leaves
const LINE_AHEAD = 110 // a switch lights its route this far ahead of a train, until the train has passed
const ON_TRACK = 4 // a switch belongs to a track that passes this close

interface Signal { train: Train[]; at: number; head: SVGCircleElement }
interface Switch { routes: { train: Train; at: number }[]; marker: SVGCircleElement; lined: SVGPathElement }

const runToPath = (train: Train, d: number) => (train.reverse ? train.length - d : d)
const point = (train: Train, d: number) => train.track.getPointAtLength(Math.min(train.length, Math.max(0, runToPath(train, d))))

export function startWayside(shot: SVGSVGElement, trains: Train[], scale: number) {
  const onTrack = (id: string | undefined) => trains.filter((train) => train.track.id === id)

  const signals: Signal[] = [...shot.querySelectorAll<SVGGElement>('.signal[data-track]')].map((g) => {
    const train = onTrack(g.dataset.track)
    const first = train[0]!
    const at = Number(g.dataset.at) * first.length
    const p = point(first, at), a = point(first, at - 3), b = point(first, at + 3)
    let n = { x: -(b.y - a.y), y: b.x - a.x }
    const len = Math.hypot(n.x, n.y) || 1
    n = { x: n.x / len, y: n.y / len }
    if ((g.dataset.side === 'above') === n.y > 0) n = { x: -n.x, y: -n.y }
    const off = (k: number) => ({ x: (p.x + n.x * k * scale).toFixed(1), y: (p.y + n.y * k * scale).toFixed(1) })
    const foot = off(4), top = off(10), head = off(13)
    make('line', { class: 'mast', x1: foot.x, y1: foot.y, x2: top.x, y2: top.y }, g)
    return { train, at, head: make('circle', { class: 'head', cx: head.x, cy: head.y, r: 3 * scale }, g) }
  })

  const switches: Switch[] = []
  shot.querySelectorAll<SVGGElement>('.switches[data-points]').forEach((g) => {
    for (const pair of g.dataset.points!.trim().split(/\s+/)) {
      const [x, y] = pair.split(',').map(Number) as [number, number]
      const routes: Switch['routes'] = []
      for (const train of trains) {
        let best = Infinity, at = 0
        for (let d = 0; d <= train.length; d += 2) {
          const p = point(train, d)
          const dist = Math.hypot(p.x - x, p.y - y)
          if (dist < best) { best = dist; at = d }
        }
        if (best < ON_TRACK) routes.push({ train, at })
      }
      const lined = make('path', { class: 'lined' }, g)
      switches.push({ routes, lined, marker: make('circle', { class: 'point', cx: x, cy: y, r: 2.2 * scale }, g) })
    }
  })

  return function update() {
    for (const signal of signals) {
      let aspect = 'clear'
      for (const train of signal.train) {
        if (!train.shown) continue
        const ahead = (from: number, to: number) => train.rear < signal.at + to && train.front > signal.at + from
        const holding = train.waiting > HOLD_S && signal.at - train.front >= 0 && signal.at - train.front < 30
        if (ahead(0, BLOCK) || holding) aspect = 'stop'
        else if (ahead(BLOCK, 2 * BLOCK) && aspect === 'clear') aspect = 'approach'
      }
      signal.head.setAttribute('data-aspect', aspect)
    }
    for (const sw of switches) {
      const route = sw.routes.find(({ train, at }) => train.shown && at - train.front < LINE_AHEAD && train.rear < at)
      sw.marker.classList.toggle('on', !!route)
      if (!route) { sw.lined.removeAttribute('d'); continue }
      const pts = [-10, -5, 0, 6, 12, 18].map((k) => point(route.train, route.at + k))
      sw.lined.setAttribute('d', 'M' + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L'))
    }
  }
}
