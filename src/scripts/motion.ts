// Page-wide motion, built on Motion (motion.dev): the reading line under the top bar, the "What's inside" parts and
// the closing call coming in as they reach the screen, the pictures lifting when pointed at, and the buttons giving
// under a press. Anyone who asks for reduced motion gets the reading line and nothing else.
import { animate, hover, inView, press, scroll, stagger } from 'motion'

const SPRING = { type: 'spring', stiffness: 260, damping: 24 } as const
const still = matchMedia('(prefers-reduced-motion: reduce)').matches

// The line along the foot of the top bar fills as you read down the page.
const progress = document.querySelector<HTMLElement>('.top .progress')
if (progress) scroll(animate(progress, { scaleX: [0, 1] }, { ease: 'linear' }))

if (!still) {
  // Each part of "What's inside": its picture slides in from its own side while the words follow in order.
  document.querySelectorAll<HTMLElement>('.feature').forEach((feature) => {
    const shot = feature.querySelector<HTMLElement>('.shot')
    const words = feature.querySelectorAll<HTMLElement>('h3, p, li')
    const side = feature.classList.contains('flip') ? -1 : 1
    if (shot) animate(shot, { opacity: 0, x: 60 * side, scale: 0.96 }, { duration: 0 })
    animate(words, { opacity: 0, y: 18 }, { duration: 0 })
    inView(feature, () => {
      if (shot) animate(shot, { opacity: 1, x: 0, scale: 1 }, { ...SPRING, delay: 0.05 })
      animate(words, { opacity: 1, y: 0 }, { duration: 0.5, ease: [0.2, 0.8, 0.2, 1], delay: stagger(0.06) })
    }, { amount: 0.3 })

    // Pointed at, the picture lifts on a spring (its glow is in Feature.astro).
    if (shot) hover(feature, () => {
      animate(shot, { y: -6, scale: 1.01 }, SPRING)
      return () => animate(shot, { y: 0, scale: 1 }, SPRING)
    })
  })

  // The closing call rises in, heading first.
  const join = document.querySelectorAll<HTMLElement>('.join .wrap > *')
  if (join.length) {
    animate(join, { opacity: 0, y: 24 }, { duration: 0 })
    inView('.join', () => {
      animate(join, { opacity: 1, y: 0 }, { duration: 0.6, ease: [0.2, 0.8, 0.2, 1], delay: stagger(0.1) })
    }, { amount: 0.4 })
  }

  // The footer's icon settles in with a small turn.
  const icon = document.querySelector<HTMLElement>('footer img')
  if (icon) {
    animate(icon, { opacity: 0, scale: 0.6, rotate: -20 }, { duration: 0 })
    inView(icon, () => { animate(icon, { opacity: 1, scale: 1, rotate: 0 }, { type: 'spring', stiffness: 200, damping: 12 }) })
  }

  // Buttons give a little under a press and spring back.
  press('.button', (button) => {
    animate(button, { scale: 0.95 }, SPRING)
    return () => animate(button, { scale: 1 }, SPRING)
  })
}
