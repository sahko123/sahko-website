# sahko.ie

Personal/channel site. Astro, static output — no server-side rendering, no
database. Content lives as markdown; the homepage's latest-video widget is
fetched once at build time (no API key, nothing shipped to the client), so
the server never does real work beyond serving files.

## Structure

```
src/
├── consts.ts               site config, nav, socials, YouTube handle
├── youtube.ts              build-time fetch of the latest upload (RSS, no API key)
├── social-icons.ts         href → icon id lookup (public/icons.svg)
├── led-header.client.js    readable source for the LED header animation —
│                           built (minified) to public/led-header.js by
│                           `npm run build:client`, not part of the Astro/Vite
│                           pipeline. See public/led-header.js and
│                           src/components/LedHeader.astro.
├── layouts/Layout.astro    shared page shell (nav/footer)
├── content.config.ts       blog collection schema
├── content/blog/*.md       blog posts
└── pages/
    ├── index.astro         home / latest video
    ├── blog/               blog index + [...slug] post pages
    ├── ads.astro           joke page linked from the homepage's bot line
    └── 404.astro

public/
├── led-header.js  generated — do not edit directly, gitignored
└── icons.svg      social icon <symbol> sprite, referenced via <use>
```

The LED header script and the icon sprite are served as plain static files
(not inlined per-page) so the browser fetches and caches each once instead
of downloading an identical copy on every page — see "Reducing page
weight" below.

## Commands

| Command                | Action                                                        |
| :---------------------- | :-------------------------------------------------------------- |
| `npm install`           | Install dependencies                                           |
| `npm run dev`            | Dev server at `localhost:4321` (auto-runs `build:client` first) |
| `npm run build`          | Build static site to `./dist/` (auto-runs `build:client` first) |
| `npm run build:client`   | Minify `src/led-header.client.js` → `public/led-header.js`      |
| `npm run preview`        | Preview the production build locally                            |

## Adding a blog post

Add a `.md` file to `src/content/blog/` with frontmatter:

```md
---
title: 'Post title'
description: 'Optional one-liner'
pubDate: 2026-07-20
---

Body content here.
```

It shows up on `/blog/` automatically, sorted by date.

## Latest video widget

`src/youtube.ts`'s `getLatestVideo()` runs at build time: it resolves
`YOUTUBE_HANDLE` (in `src/consts.ts`) to a channel ID by scraping the
channel page, then reads the channel's public RSS feed
(`youtube.com/feeds/videos.xml`) for the newest upload. No API key, no
client-side request — the result is baked into `index.html` at build time
and only changes on the next rebuild. If the fetch fails (network hiccup,
YouTube changing page structure) it logs a warning and the section falls
back to a "couldn't load" message rather than breaking the build.

## Reducing page weight

Astro would otherwise inline every page's CSS/JS directly into its HTML —
fine for a single page, wasteful once every page re-ships an identical
copy of the same LED header script, global styles, and social icons.
`astro.config.mjs` sets `build.inlineStylesheets: 'never'` so CSS is
always a shared, content-hashed `/_astro/*.css` file, the LED header
animation is a plain static `public/led-header.js` instead of an Astro
component script, and the social icons are a `public/icons.svg` `<symbol>`
sprite referenced via `<use>` instead of inline `<path>` data repeated on
every page. All three are fetched once and cached (see `deploy/nginx.conf`)
instead of downloaded fresh on every page navigation.

The trade-off: a first-ever page view now costs a few more HTTP requests
than one fully-inlined page did, since the browser fetches the shared
files alongside the page's own (now much smaller) HTML. Every subsequent
page view in that session is substantially cheaper — for a personal site
where visitors click around, that's the right side to be on.

## Deploying

See [`deploy/README.md`](deploy/README.md) for the nginx + Cloudflare Tunnel
setup on the ZimaOS box.
