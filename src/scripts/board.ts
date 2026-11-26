// The "Dispatch it together" picture plays a dispatcher at work, over and over: a command is typed, the game
// confirms it, the signal clears and the route lights green, and the train runs through the cleared block into the
// next desk. Everything is worked out from the time into the loop, so it can't drift. Paused while off screen; with
// reduced motion, it shows the moment the route is cleared.

const LOOP_S = 10
const COMMAND = 'CLR MG-E'
const ROUTE = { start: 90, signal: 250, desk: 400, end: 500 } // x along the main line

const IDLE = '#525252'
const OCCUPIED = '#EF4444'
const CLEARED = '#22C55E'

// Where the train is at time t: waiting, then through the cleared block, then on into the next desk.
const trainX = (t: number) =>
  t < 3 ? ROUTE.start
    : t < 6.5 ? ROUTE.start + ((t - 3) / 3.5) * (ROUTE.desk - 30 - ROUTE.start)
      : t < 8.5 ? ROUTE.desk - 30 + ((t - 6.5) / 2) * (ROUTE.end - ROUTE.desk + 30)
        : ROUTE.end

export function startBoard(svg: SVGSVGElement) {
  const $ = <T extends Element>(name: string) => svg.querySelector<T>(`[data-part="${name}"]`)!
  const blockA = $<SVGPathElement>('block-a'), blockB = $<SVGPathElement>('block-b'), blockC = $<SVGPathElement>('block-c')
  const signal = $<SVGPathElement>('signal'), train = $<SVGGElement>('train')
  const typed = $<SVGTextElement>('typed'), state = $<SVGTextElement>('state')

  function show(t: number) {
    const x = trainX(t)
    const cleared = t >= 2.4 && x < ROUTE.signal // the signal drops back to red behind the train
    blockA.setAttribute('stroke', x < ROUTE.signal ? OCCUPIED : IDLE)
    blockB.setAttribute('stroke', x >= ROUTE.signal && x < ROUTE.desk ? OCCUPIED : t >= 2.4 && x < ROUTE.signal ? CLEARED : IDLE)
    blockC.setAttribute('stroke', x >= ROUTE.desk ? OCCUPIED : IDLE)
    signal.setAttribute('fill', cleared ? CLEARED : OCCUPIED)
    signal.setAttribute('stroke', cleared ? CLEARED : OCCUPIED)
    train.setAttribute('transform', `translate(${x.toFixed(1)} 0)`)
    train.style.opacity = String(t > 8.5 ? Math.max(0, 1 - (t - 8.5) / 0.6) : t < 0.4 ? t / 0.4 : 1)
    typed.textContent = COMMAND.slice(0, Math.max(0, Math.floor((t - 0.6) / 0.09)))
    state.textContent = t < 1.5 ? '' : t < 2.4 ? 'SENT' : t < 8.5 ? 'CONFIRMED' : ''
    state.setAttribute('fill', t < 2.4 ? '#D4D4D4' : '#4ADE80')
  }

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return show(2.5)
  let frame = 0
  let started = 0
  const tick = (now: number) => {
    started ||= now
    show(((now - started) / 1000) % LOOP_S)
    frame = requestAnimationFrame(tick)
  }
  show(0)
  new IntersectionObserver(([entry]) => {
    cancelAnimationFrame(frame)
    if (entry?.isIntersecting) { started = 0; frame = requestAnimationFrame(tick) }
  }).observe(svg)
}
