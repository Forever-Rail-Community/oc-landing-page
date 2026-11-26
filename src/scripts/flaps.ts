// Split-flap lettering for the arrivals board: when the board scrolls into view, each row's lettering flips through
// a few random characters before settling, a row at a time, like a station board updating. With reduced motion the
// lettering is simply there.

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const FLIPS = 7 // random characters before each one settles
const FLIP_MS = 45
const ROW_MS = 140 // between rows starting

const random = () => CHARS[Math.floor(Math.random() * CHARS.length)]!

function flip(el: HTMLElement, delay: number) {
  const text = el.dataset.flap ?? el.textContent ?? ''
  el.dataset.flap = text
  let step = 0
  window.setTimeout(function next() {
    // Each character settles a little after the one before it, so the word resolves left to right.
    el.textContent = [...text].map((c, i) => (c === ' ' || step - i * 0.6 >= FLIPS ? c : random())).join('')
    if (step++ < FLIPS + text.length * 0.6) window.setTimeout(next, FLIP_MS)
    else el.textContent = text
  }, delay)
}

export function startFlaps(board: HTMLElement) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const rows = [...board.querySelectorAll<HTMLElement>('[data-row]')]
  new IntersectionObserver((entries, watcher) => {
    if (!entries.some((e) => e.isIntersecting)) return
    watcher.disconnect()
    rows.forEach((row, k) => row.querySelectorAll<HTMLElement>('[data-flap]').forEach((el) => flip(el, k * ROW_MS)))
  }, { threshold: 0.35 }).observe(board)
}
