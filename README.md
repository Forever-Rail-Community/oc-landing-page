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
  - `TopBar.astro`, and `Join.astro`, which ends the page.
  - `DiscordButton.astro`: the Join the Discord button, in Discord's colors with its icon (from Simple Icons, a
    build-time dependency), used in the top bar, the opening and the closing call.
- `src/scripts/motion.ts`: page-wide motion on [Motion](https://motion.dev): the reading line under the top bar, the
  "What's inside" parts, the closing call and its icon coming in, the pictures lifting when pointed at, and buttons giving under a
  press.
- `tools/draw-map.py`: draws the made-up terrain and rivers under the rails, once for the whole route, and cuts each
  live map's background from it. `tools/find-switches.py` finds where the rails branch, for the picture's switches.
- `src/components/LiveMap.astro`: a live map of part of the route, used by the picture and the call to join.
- `src/scripts/wayside.ts`: the live maps' signals and switches, which answer to the trains.
- `tools/trace-rail.py`: traces one rail of the drawing into an SVG path, for the trains' tracks in `MapShot.astro`
  and `Hero.astro`.
- `src/data/arrivals.ts`: what's on the arrivals board and when each is due (at launch, next update, future).
- `src/data/site.ts`: the links (Discord, server status) and the description used in previews.
- `public/`: images. `track.webp` is the rails drawn from the dashboard's map data (no names, trains or
  signals). `tools/draw-map.py` draws terrain and rivers under them: the maps at several widths in `maps/` (listed in
  `src/data/maps.json`): the whole route behind the opening (and on its side for phones), and the live maps. `logo.png`, `favicon.png` and `apple-touch-icon.png` are from the Forever
  Rail logos. `og.png` is the preview Discord and other sites show; retake it (1200 × 630) when the opening's look
  changes.

The page never names the games. Its pictures use made-up names (Mill Gap, EB 12).

Every animation stops for people who ask their system for reduced motion, and the map and board pause while off
screen.

When the Operations Center is ready for this domain, move `oc.foreverrail.com` from this project to the dashboard's
project in Vercel (Settings > Domains).
