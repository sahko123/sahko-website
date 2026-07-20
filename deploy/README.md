# Deploying to the ZimaOS box

The site is fully static — `npm run build` produces `dist/`, and nginx just
serves those files. There's no runtime, no database, nothing for the server
to compute per request.

## 1. Build and copy

```sh
npm run build
# copy dist/ to the ZimaOS box, e.g.:
rsync -av --delete dist/ user@zimaos:/path/to/sahko-website/dist/
```

## 2. nginx

Use [`nginx.conf`](nginx.conf) as a starting point — adjust the `root` path
and drop it wherever ZimaOS expects nginx site configs, then reload nginx.

It listens on `127.0.0.1:8080` (plain HTTP, no TLS) because Cloudflare
Tunnel terminates TLS at the edge and forwards to this local origin — nginx
never needs a port exposed to the internet.

## 3. Cloudflare Tunnel

Since `cloudflared` is already running, just point (or confirm) the public
hostname for `sahko.ie` at this origin in the tunnel's ingress config
(Zero Trust dashboard → Networks → Tunnels → your tunnel → Public Hostname),
e.g.:

```
sahko.ie  →  http://localhost:8080
```

Make sure the DNS record for `sahko.ie` is **proxied** (orange cloud) in
Cloudflare DNS — that's what puts Cloudflare's edge, caching, and rate
limiting in front of the tunnel instead of a plain passthrough.

## 4. Cloudflare settings to protect the origin

The site is static and public, so lean on Cloudflare's edge to absorb almost
all traffic rather than the box:

- **Cache Rules** (Rules → Cache Rules): create a rule matching
  `hostname eq "sahko.ie"` with "Eligible for cache" + a sensible Edge TTL
  (e.g. a few minutes). At this site's size Astro inlines all CSS/JS into
  each page rather than emitting separately-cacheable hashed assets, so this
  Cloudflare-level rule — not [`nginx.conf`](nginx.conf)'s per-file-type
  headers — is what actually keeps most requests off the origin.
- **Security → WAF → Rate limiting rules**: throttle by IP (e.g. >100
  req/min) with a Challenge or Block action, so a traffic spike or scraper
  can't hammer the small server directly.
- **Bot Fight Mode** (Security → Bots): free tier, cuts a chunk of
  automated/scraper traffic before it reaches origin.
- **Auto Minify** (Speed → Optimization): optional, Astro's output is
  already small, but harmless to enable for HTML/CSS/JS.

## Updating the site

Re-run steps 1–2 (build, rsync, done) — no server restart needed since
nginx is just serving files from disk.
