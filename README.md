# oc.foreverrail.com: landing page

What the Forever Rail Operations Center is and what's coming, until the Operations Center itself moves to this domain.
An [Astro](https://astro.build) site in TypeScript, built to plain HTML with only the scripts its animations need.

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # checks the TypeScript, then writes the site to dist/
```

Vercel builds it with `npm run build` and serves `dist/` (set in `vercel.json`); fonts and styles end up in `dist/assets/`.

## Where things are

- `src/pages/index.astro`: the page, made of the parts in `src/components/`:
  - `Hero.astro`, with `src/scripts/puzzle.ts`: the opening. The rails drawing is cut into a jigsaw; on load the pieces
    fly in and lock together, then the last piece slides out of its gap, where the message sits. Wide screens get a
    3 × 3 board; phones and short screens get one column of full-width pieces.
  - `Inside.astro`: what's inside, three parts (`Feature.astro`) each with a picture:
    - `MapShot.astro`, with `src/scripts/trains.ts`: trains moving along paths traced over the rails drawing.
    - `BoardShot.astro`, with `src/scripts/board.ts`: a small CTC board playing a dispatcher at work on a loop.
    - `RoadmapShot.astro`: roadmap items with their names blurred, from requested to done.
  - `Arrivals.astro`, with `src/scripts/flaps.ts`: what's next, as a split-flap arrivals board whose lettering flips
    into place as it scrolls into view. It says when each thing is due, never how far along it is.
  - `TopBar.astro`, `Join.astro`, `Footer.astro`.
- `src/data/arrivals.ts`: what's on the arrivals board and when each is due (opening day, soon after, later).
- `src/data/site.ts`: the links (Discord, server status) and the description used in previews.
- `public/`: images. `track.webp` and `track-tall.webp` are the rails drawn from the dashboard's map data (no names,
  trains or signals), wide and on its side. `logo.png`, `favicon.png` and `apple-touch-icon.png` are from the Forever
  Rail logos. `og.png` is the preview Discord and other sites show; retake it (1200 × 630) when the opening's look
  changes.

The page never names the games. Its pictures use made-up names (Mill Gap, EB 12).

Every animation stops for people who ask their system for reduced motion, and the map and board pause while off
screen.

When the Operations Center is ready for this domain, move `oc.foreverrail.com` from this project to the dashboard's
project in Vercel (Settings > Domains).
