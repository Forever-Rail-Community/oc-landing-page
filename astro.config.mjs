// A static site: `astro build` writes plain HTML, CSS and the animations' scripts to dist/, which Vercel serves.
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://oc.foreverrail.com',
  build: { assets: 'assets' } // fonts and styles, under dist/assets/
})
