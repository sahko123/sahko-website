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
├── site.client.js          readable source for the site-wide client script (LED
│                           header animation + footer clock) — built (bundled +
│                           minified) to public/site.js by `npm run build:client`,
│                           not part of the Astro/Vite pipeline. Embedding this
│                           directly as a script in the shared Layout.astro instead
│                           gets inlined (duplicated) per page by Astro — confirmed
│                           empirically — so it has to be a real public/ file.
├── layouts/Layout.astro    shared page shell (nav / footer / clock / script tag)
├── content.config.ts       blog collection schema
├── content/blog/*.md       blog posts
└── pages/
    ├── index.astro         home / latest video
    ├── blog/               blog index + [...slug] post pages
    ├── ads.astro           joke page linked from the homepage's bot line
    └── 404.astro

public/
├── site.js       generated — do not edit directly, gitignored
├── og-image.png  social share preview (1200x630), rendered from the LED font
├── robots.txt    disallows /ads/, points at the sitemap
└── favicon.{ico,svg}
```

`public/site.js` is served as a plain static file (not inlined per-page) so
the browser fetches and caches it once instead of downloading an identical
copy on every page — see "Reducing page weight" below. Social icons are
fetched per-visit from `cdn.simpleicons.org` (by slug/color from
`SOCIAL_LINKS`) rather than self-hosted.

## Commands

| Command                | Action                                                        |
| :---------------------- | :-------------------------------------------------------------- |
| `npm install`           | Install dependencies                                           |
| `npm run dev`            | Dev server at `localhost:4321` (auto-runs `build:client` first) |
| `npm run build`          | Build static site to `./dist/` (auto-runs `build:client` first) |
| `npm run build:client`   | Bundle + minify `src/site.client.js` → `public/site.js`        |
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
copy of the same client script and global styles. `astro.config.mjs` sets
`build.inlineStylesheets: 'never'` so CSS is always a shared,
content-hashed `/_astro/*.css` file, and the site-wide client behavior
(LED header animation + footer clock) is a plain static `public/site.js`
instead of an Astro component script. Both are fetched once and cached
(see `deploy/nginx.conf`) instead of downloaded fresh on every page
navigation. Social icons are likewise not shipped in the HTML — they're
`<img>` tags pointing at `cdn.simpleicons.org`.

The trade-off: a first-ever page view now costs a few more HTTP requests
than one fully-inlined page did, since the browser fetches the shared
files (and the icon CDN) alongside the page's own (now much smaller) HTML.
Every subsequent page view in that session is substantially cheaper — for
a personal site where visitors click around, that's the right side to be
on. The icon CDN is the one third-party dependency: it sees each visitor's
IP, and icons won't render if it's down.

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
