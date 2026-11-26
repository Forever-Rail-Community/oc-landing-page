// Trains gliding along the rails in the "Watch it run" picture: each one follows a path traced over the drawing, at
// its own speed and direction, and fades at the ends of the path before starting again. Paused while the picture is
// off screen; with reduced motion, the trains stay put.

const FADE = 0.06 // of the path, at each end

interface Run {
  dot: SVGGElement
  path: SVGPathElement
  length: number
  speed: number // px a second
  reverse: boolean
  at: number // 0 to 1 along the path
}

export function startTrains(shot: SVGSVGElement) {
  const runs: Run[] = [...shot.querySelectorAll<SVGGElement>('[data-train]')].map((dot) => {
    const path = shot.querySelector<SVGPathElement>(`#${dot.dataset.train}`)!
    return { dot, path, length: path.getTotalLength(), speed: Number(dot.dataset.speed), reverse: dot.dataset.reverse === 'true', at: Number(dot.dataset.at) }
  })
  const draw = (run: Run) => {
    const t = run.reverse ? 1 - run.at : run.at
    const p = run.path.getPointAtLength(t * run.length)
    run.dot.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`)
    run.dot.style.opacity = String(Math.min(1, run.at / FADE, (1 - run.at) / FADE))
  }
  runs.forEach(draw)
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

  let last = 0
  let frame = 0
  const tick = (now: number) => {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0
    last = now
    for (const run of runs) {
      run.at = (run.at + (run.speed * dt) / run.length) % 1
      draw(run)
    }
    frame = requestAnimationFrame(tick)
  }
  new IntersectionObserver(([entry]) => {
    cancelAnimationFrame(frame)
    last = 0
    if (entry?.isIntersecting) frame = requestAnimationFrame(tick)
  }).observe(shot)
}
