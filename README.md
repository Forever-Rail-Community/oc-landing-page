# oc.foreverrail.com: parked page

A placeholder for the Forever Rail Operations Center until it moves to this domain. One static page, no build step:
Vercel serves the folder as it is.

- `index.html`: the page. The script at the bottom cuts the background into a jigsaw whose center piece slides out of
  its gap on load; the message sits in the gap. Wide screens get a 3 × 3 board; phones and short screens get one
  column of full-width pieces, with the gap as tall as the message needs.
- `track.webp`, `track-tall.webp`: the background for wide screens and for phones. Rails only, drawn from the
  dashboard's map data (no names, trains or signals); the tall one is the same drawing turned on its side.
- `logo.png`, `favicon.png`, `apple-touch-icon.png`: from the Forever Rail logos.
- `og.png`: the preview Discord and other sites show when the link is shared.

To change the wording, edit `index.html` (the `<main>` element, plus the description meta tags at the top).
Retake `og.png` if the look changes, since previews show it.

When the Operations Center is ready for this domain, move `oc.foreverrail.com` from this project to the dashboard's
project in Vercel (Settings > Domains).
