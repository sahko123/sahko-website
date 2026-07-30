# sahko.ie

Personal/channel site. Astro, static output — no server-side rendering, no
database. Content lives as markdown; the homepage's latest-video widget is
fetched once at build time (no API key, nothing shipped to the client), so
the server never does real work beyond serving files.

## Structure

```
src/
├── consts.ts               site config, nav, socials (+icon slugs), YouTube handle
├── youtube.ts              build-time fetch of the latest upload (RSS, no API key)
├── format-date.ts          shared date/timestamp formatting (blog dates + footer clock)
├── site.client.js          site-wide client script (LED header animation,
│                           video carousel, footer clock). Loaded from
│                           Layout.astro; Astro bundles/minifies/hashes it into
│                           a single shared /_astro/*.js chunk.
├── layouts/Layout.astro    shared page shell (nav / footer / clock / script tag)
├── content.config.ts       blog collection schema
├── content/blog/*.md       blog posts
└── pages/
    ├── index.astro         home / video carousel
    ├── blog/               blog index + [...slug] post pages
    ├── ads.astro           joke page linked from the homepage's bot line
    └── 404.astro

public/
├── og-image.png  social share preview (1200x630), rendered from the LED font
├── robots.txt    disallows /ads/, points at the sitemap
└── favicon.{ico,svg}
```

Everything in `public/` is served verbatim at the site root. Note these files
are *not* content-hashed, so they're cached for a day rather than forever
(see `deploy/nginx.conf`) — a change to one takes up to 24h to be guaranteed
visible. Social icons aren't here at all: they're fetched per-visit from
`cdn.simpleicons.org` (by slug/color from `SOCIAL_LINKS`).

## Commands

| Command           | Action                                  |
| :----------------- | :--------------------------------------- |
| `npm install`      | Install dependencies                     |
| `npm run dev`       | Dev server at `localhost:4321`           |
| `npm run build`     | Build static site to `./dist/`           |
| `npm run preview`   | Preview the production build locally     |

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

## Caching and page weight

By default Astro inlines small CSS/JS straight into each page's HTML —
fine for one page, wasteful once every page re-ships an identical copy,
and (worse) an inlined asset has no URL to cache or cache-bust. Two config
settings in `astro.config.mjs` force both out to shared files:

- `build.inlineStylesheets: 'never'` — CSS is always a shared
  `/_astro/*.css` file.
- `vite.build.assetsInlineLimit: 0` — the client script is always a shared
  `/_astro/*.js` file. Without this, Vite inlines anything under 4096
  bytes, which silently flips behavior as the bundle grows or shrinks
  past that line.

Both land in `/_astro/` with a **content hash in the filename**, so a new
build always produces a new URL. That's what makes
`Cache-Control: immutable, max-age=1y` safe for them in `deploy/nginx.conf`:
a stale copy is impossible, because changed content means a changed URL.

This matters more than it sounds. An earlier version of this site served
the script as an unhashed `/site.js` cached for a day — after a deploy,
browsers *and* Cloudflare's edge would both keep serving the previous
version from cache for up to 24h, with no way to tell it had changed
short of a manual cache purge. Hashed filenames remove that failure mode
entirely.

Files in `public/` (favicons, OG image) are the exception — hand-placed,
so unhashed, so capped at a day's cache. Social icons aren't shipped in
the HTML at all; they're `<img>` tags pointing at `cdn.simpleicons.org`.

The trade-off: a first-ever page view costs a few more HTTP requests than
a fully-inlined page, since the browser fetches the shared files (and the
icon CDN) alongside the page's own now-much-smaller HTML. Every subsequent
page view in that session is substantially cheaper — for a personal site
where visitors click around, that's the right side to be on. The icon CDN
is the one third-party dependency: it sees each visitor's IP, and icons
won't render if it's down.

## SEO

`Layout.astro` sets a canonical link plus Open Graph / Twitter card tags
(title, description, and `og-image.png`) on every page, using each page's
own `title`/`description` props — see a blog post's `<Layout title=...
description=...>` call for an example. `@astrojs/sitemap` generates
`sitemap-index.xml` at build time from the real routes, filtered to exclude
`/ads/`; `public/robots.txt` disallows `/ads/` too and points crawlers at
the sitemap. `og-image.png` was rendered once by loading the LED font's
pixel data into a throwaway canvas page and exporting it — not regenerated
by the build, so if the site's name or branding ever changes, it needs to
be redone by hand (or scripted, if it becomes worth it).

## Deploying

See [`deploy/README.md`](deploy/README.md) for the nginx + Cloudflare Tunnel
setup on the ZimaOS box.
