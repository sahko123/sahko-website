# sahko.ie

Personal/channel site. Astro, static output — no server-side rendering, no
database. Content lives as markdown; the videos page fetches YouTube data
client-side, so the server never does real work beyond serving files.

## Structure

```
src/
├── consts.ts             site config, nav, socials, YouTube handle/API key
├── layouts/Layout.astro  shared page shell (nav/footer)
├── content.config.ts     blog collection schema
├── content/blog/*.md     blog posts
└── pages/
    ├── index.astro       home / links
    ├── blog/             blog index + [...slug] post pages
    ├── videos.astro      client-side YouTube feed
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

## Enabling the video feed

`src/pages/videos.astro` fetches YouTube in the visitor's browser — the
server is never involved. To turn it on:

1. Create a YouTube Data API v3 key at
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Restrict the key to **HTTP referrers** = `https://sahko.ie/*` (the key
   ships in client-side JS and is publicly visible, so this restriction is
   what keeps it from being abused elsewhere).
3. Set `YOUTUBE_API_KEY` in `src/consts.ts`.

## Deploying

See [`deploy/README.md`](deploy/README.md) for the nginx + Cloudflare Tunnel
setup on the ZimaOS box.
