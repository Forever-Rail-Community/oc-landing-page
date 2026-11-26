// The opening: the rails drawing cut into a jigsaw whose center piece is out of its gap, with the message in the gap.
// Wide screens: a fixed 3 x 3 board over a 1440 x 900 drawing, scaled to cover the opening.
// Phones and short screens: one column of full-width pieces, the gap as tall as the message needs.
// On load the pieces fly in from around the screen and lock together, the gap's outline appears, and the last piece
// slides out of it. With reduced motion, it's drawn already put together.
import maps from '../data/maps.json'

const NS = 'http://www.w3.org/2000/svg'
type Point = [number, number]
type Sides = [number, number, number, number] // top, right, bottom, left: 1 a tab out, -1 a blank in, 0 straight

interface Layout {
  width: number
  height: number
  fit: 'slice' | 'none'
  image: string
  pieces: string[]
  gap: string
  rest: string // where the loose piece comes to rest, as a CSS transform
}

// The whole route's picture (tools/draw-map.py) at the smallest width that's at least as many pixels as its long side
// is shown at, so it's sharp without fetching more than it needs. `tall` is the one on its side, for the column.
function routeImage(tall: boolean, shownPx: number) {
  const widths = maps.route.widths
  const width = widths.find((w) => w >= shownPx * devicePixelRatio) ?? widths[widths.length - 1]
  return `/maps/route${tall ? '-tall' : ''}-${width}.webp`
}

// One side of a piece from P to Q, with its tab or blank `size` deep.
function side(P: Point, Q: Point, out: Point, d: number, size: number) {
  if (!d) return `L${Q[0]} ${Q[1]}`
  const at = (t: number, n: number) =>
    `${(P[0] + (Q[0] - P[0]) * t + out[0] * n * size * d).toFixed(1)} ${(P[1] + (Q[1] - P[1]) * t + out[1] * n * size * d).toFixed(1)}`
  return `L${at(0.36, 0)}C${at(0.40, 0)} ${at(0.42, 0.04)} ${at(0.40, 0.10)}C${at(0.37, 0.20)} ${at(0.44, 0.27)} ${at(0.50, 0.27)}`
    + `C${at(0.56, 0.27)} ${at(0.63, 0.20)} ${at(0.60, 0.10)}C${at(0.58, 0.04)} ${at(0.60, 0)} ${at(0.64, 0)}L${Q[0]} ${Q[1]}`
}

function piece(x: number, y: number, w: number, h: number, [top, right, bottom, left]: Sides, tab: number) {
  return `M${x.toFixed(1)} ${y.toFixed(1)}` + side([x, y], [x + w, y], [0, -1], top, tab) + side([x + w, y], [x + w, y + h], [1, 0], right, tab)
    + side([x + w, y + h], [x, y + h], [0, 1], bottom, tab) + side([x, y + h], [x, y], [-1, 0], left, tab) + 'Z'
}

// The 3 x 3 board. Shared edges: 1 bulges toward the higher row or column; around the center all bulge outward.
function wide(hero: HTMLElement): Layout {
  const W = 480, H = 300
  const rows = (r: number, c: number) => (c === 1 ? (r === 0 ? -1 : 1) : (r + c) % 2 ? 1 : -1)
  const cols = (r: number, c: number) => (r === 1 ? (c === 0 ? -1 : 1) : (r + c) % 2 ? -1 : 1)
  const sides = (r: number, c: number): Sides =>
    [r === 0 ? 0 : -rows(r - 1, c), c === 2 ? 0 : cols(r, c), r === 2 ? 0 : rows(r, c), c === 0 ? 0 : -cols(r, c - 1)]
  const pieces: string[] = []
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    if (r !== 1 || c !== 1) pieces.push(piece(c * W, r * H, W, H, sides(r, c), H))
  }
  const shown = 1440 * Math.max(hero.clientWidth / 1440, hero.clientHeight / 900) // covering the opening
  return { width: 1440, height: 900, fit: 'slice', image: routeImage(false, shown), pieces, gap: piece(W, H, W, H, sides(1, 1), H), rest: 'translate(560px, 360px) rotate(-9deg)' }
}

// One column as wide as the opening. Pieces only lock top and bottom; around the gap both bulge outward.
function column(hero: HTMLElement, message: HTMLElement): Layout {
  const width = hero.clientWidth, height = hero.clientHeight
  const H = Math.round(message.offsetHeight + 72), top = Math.round((height - H) / 2), tab = Math.min(width, H) * 0.7
  const edge = (k: number) => (k === -1 ? -1 : k === 0 ? 1 : Math.abs(k) % 2 ? 1 : -1) // between row k and k + 1
  const pieces: string[] = []
  for (let k = -Math.ceil(top / H) - 1; top + k * H < height + H; k++) {
    if (k !== 0) pieces.push(piece(0, top + k * H, width, H, [-edge(k - 1), 0, edge(k), 0], tab))
  }
  return { width, height, fit: 'none', image: routeImage(true, height), pieces, gap: piece(0, top, width, H, [1, 0, 1, 0], tab), rest: `translate(${Math.round(width * 0.3)}px, ${Math.round(height / 2 + H * 0.15)}px) rotate(-8deg)` }
}

const ARRIVE_MS = 900 // each piece's flight
const STAGGER_MS = 90 // between pieces
const FONTS_WAIT_MS = 600 // the most to wait for the fonts before starting, so the gap is sized for the message

export function startPuzzle(hero: HTMLElement) {
  const board = hero.querySelector<SVGSVGElement>('.board')!
  const message = hero.querySelector<HTMLElement>('.message')!
  const narrow = matchMedia('(max-width: 760px), (max-height: 600px)')
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  let first = true

  function lay() {
    const p = narrow.matches ? column(hero, message) : wide(hero)
    board.setAttribute('viewBox', `0 0 ${p.width} ${p.height}`)
    board.classList.toggle('column', narrow.matches) // the live map's trains, signals and places are only on the wide board
    board.setAttribute('preserveAspectRatio', p.fit === 'slice' ? 'xMidYMid slice' : 'none')
    const pattern = board.querySelector('#rails')!, image = pattern.querySelector('image')!
    for (const el of [pattern, image]) { el.setAttribute('width', String(p.width)); el.setAttribute('height', String(p.height)) }
    image.setAttribute('href', p.image)
    const dim = board.querySelector('.dim')!
    dim.setAttribute('width', String(p.width)); dim.setAttribute('height', String(p.height))
    board.querySelector('.pieces')!.replaceChildren(...p.pieces.map((d, i) => {
      const path = document.createElementNS(NS, 'path')
      path.setAttribute('class', 'seam')
      path.setAttribute('fill', 'url(#rails)')
      path.setAttribute('d', d)
      // Where it flies in from: away from the middle, turned a little, the first time only.
      if (first && !still) {
        const angle = (i / p.pieces.length) * Math.PI * 2 + Math.random() * 0.6
        path.style.setProperty('--from', `translate(${Math.round(Math.cos(angle) * p.width * 0.35)}px, ${Math.round(Math.sin(angle) * p.height * 0.35)}px) rotate(${Math.round((Math.random() - 0.5) * 40)}deg)`)
        path.style.transitionDelay = `${i * STAGGER_MS}ms`
      }
      return path
    }))
    board.querySelector('.gap')!.setAttribute('d', p.gap)
    board.querySelector('.loose path')!.setAttribute('d', p.gap)
    board.style.setProperty('--rest', p.rest)
    // The gap opens once every piece is in, and the message shows once the loose piece is out of the way.
    const assembled = still ? 0 : ARRIVE_MS + p.pieces.length * STAGGER_MS
    hero.style.setProperty('--assembled-ms', `${assembled}ms`)
    hero.style.setProperty('--message-delay', `${still ? 0 : assembled + 900}ms`)
  }

  // Starts once the fonts are in (or soon anyway), drawn scattered for two frames so the pieces have somewhere to fly
  // in from. Later layouts (a resize, the screen turning) just redraw.
  const fonts = Promise.race([document.fonts?.ready, new Promise((done) => setTimeout(done, FONTS_WAIT_MS))])
  fonts.then(() => {
    lay()
    if (!still) board.classList.add('scattered')
    hero.classList.add('started')
    requestAnimationFrame(() => requestAnimationFrame(() => {
      board.classList.remove('scattered')
      board.classList.add('settled')
      first = false
    }))
    let pending: number | undefined
    addEventListener('resize', () => { clearTimeout(pending); pending = window.setTimeout(lay, 120) })
    narrow.addEventListener('change', lay)
  })
}
