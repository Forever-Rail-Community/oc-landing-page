// Trains running in the "Watch it run" picture. Each has its own track (a path traced over the rails drawing), so
// none ever meet, and runs like a train: it pulls away gently, runs, eases to a stop at its station, waits, and goes
// on to the end of the line, then appears again at the start after a while. A train is drawn as its whole length of
// cars along the track (the path's own stroke, cut down with a dash), with its headlight at the front.
// Paused while the picture is off screen; with reduced motion, the trains stand at their stations.

const FADE = 0.05 // of the run, at each end
const OFF_S = 4 // between leaving the picture and appearing again

interface Leg { from: number; to: number; start: number; end: number } // along the track, 0 to 1, and when
interface Train {
  cars: SVGPathElement
  light: SVGCircleElement
  track: SVGPathElement
  length: number
  carsLength: number
  reverse: boolean
  legs: Leg[]
  cycle: number
  offset: number
}

// Smooth starts and stops.
const ease = (t: number) => t * t * (3 - 2 * t)

function schedule(length: number, speed: number, stops: number[], dwell: number): { legs: Leg[]; cycle: number } {
  const points = [0, ...stops, 1]
  const legs: Leg[] = []
  let time = 0
  for (let i = 0; i < points.length - 1; i++) {
    const run = (((points[i + 1]! - points[i]!) * length) / speed) * 1.5 // easing in and out takes longer
    legs.push({ from: points[i]!, to: points[i + 1]!, start: time, end: time + run })
    time += run + (i < points.length - 2 ? dwell : 0)
  }
  return { legs, cycle: time + OFF_S }
}

// Where along its track a train is at time t into its cycle (past the end means it's off the picture).
function along(train: Train, t: number) {
  const now = t % train.cycle
  for (const leg of train.legs) {
    if (now < leg.start) return leg.from // waiting at a station
    if (now <= leg.end) return leg.from + (leg.to - leg.from) * ease((now - leg.start) / (leg.end - leg.start))
  }
  return 1
}

export function startTrains(shot: SVGSVGElement) {
  const trains: Train[] = [...shot.querySelectorAll<SVGGElement>('[data-track]')].map((g) => {
    const track = shot.querySelector<SVGPathElement>(`#${g.dataset.track}`)!
    const length = track.getTotalLength()
    const stops = (g.dataset.stops ?? '').split(' ').filter(Boolean).map(Number)
    const cars = g.querySelector<SVGPathElement>('path')!
    cars.setAttribute('d', track.getAttribute('d')!)
    return {
      cars, track, length,
      light: g.querySelector('circle')!,
      carsLength: Number(g.dataset.cars),
      reverse: g.dataset.reverse === 'true',
      offset: Number(g.dataset.offset ?? 0),
      ...schedule(length, Number(g.dataset.speed), stops, Number(g.dataset.dwell ?? 4))
    }
  })

  const draw = (train: Train, at: number) => {
    // `at` runs 0 to 1 in the direction of travel; the front of the train is that far along.
    const head = (train.reverse ? 1 - at : at) * train.length
    const back = train.reverse ? head + train.carsLength : head - train.carsLength
    const from = Math.min(head, back)
    train.cars.style.strokeDasharray = `${train.carsLength} ${train.length * 2}`
    train.cars.style.strokeDashoffset = String(-from)
    const p = train.track.getPointAtLength(head)
    train.light.setAttribute('cx', p.x.toFixed(1))
    train.light.setAttribute('cy', p.y.toFixed(1))
    const shown = at >= 1 ? 0 : Math.min(1, at / FADE, (1 - at) / FADE)
    train.cars.style.opacity = train.light.style.opacity = String(Math.max(0, shown))
  }

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    trains.forEach((train) => draw(train, train.legs[0]!.to))
    return
  }
  let frame = 0
  let started = 0
  const tick = (now: number) => {
    started ||= now
    const t = (now - started) / 1000
    trains.forEach((train) => draw(train, along(train, t + train.offset)))
    frame = requestAnimationFrame(tick)
  }
  new IntersectionObserver(([entry]) => {
    cancelAnimationFrame(frame)
    if (entry?.isIntersecting) frame = requestAnimationFrame(tick)
  }).observe(shot)
}
