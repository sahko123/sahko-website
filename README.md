# sahko.ie

Personal/channel site. Astro, static output — no server-side rendering, no
database. Content lives as markdown; the homepage's latest-video widget is
fetched once at build time (no API key, nothing shipped to the client), so
the server never does real work beyond serving files.

## Structure

```
src/
├── consts.ts             site config, nav, socials, YouTube handle
├── youtube.ts            build-time fetch of the latest upload (RSS, no API key)
├── layouts/Layout.astro  shared page shell (nav/footer)
├── content.config.ts     blog collection schema
├── content/blog/*.md     blog posts
└── pages/
    ├── index.astro       home / links / latest video
    ├── blog/             blog index + [...slug] post pages
    ├── ads.astro         joke page linked from the homepage's bot line
    └── 404.astro
```

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

## Deploying

See [`deploy/README.md`](deploy/README.md) for the nginx + Cloudflare Tunnel
setup on the ZimaOS box.
