# Deploying to the ZimaBoard

The site is fully static — `npm run build` produces `dist/`, and nginx just
serves those files. There's no runtime, no database, nothing for the server
to compute per request.

## The setup

```
Internet → Cloudflare edge → cloudflared (ZimaOS app) → nginx container :8080 → dist/
```

Both cloudflared and nginx run as Docker containers on the ZimaBoard
(`192.168.1.187`). ZimaOS is Docker-first and its own Caddy gateway already
owns host port 80, which is why the site gets port **8080** instead.

**The container gotcha:** cloudflared runs in its own container, so
`localhost:8080` in its config points at *itself*, not the ZimaBoard. The
tunnel ingress must use the host's LAN IP (`192.168.1.187:8080`).

## 1. First-time setup on the ZimaBoard

Create the app directory and drop in the two config files
([`docker-compose.yml`](docker-compose.yml) and [`nginx.conf`](nginx.conf)):

```
/DATA/AppData/sahko-website/
├── docker-compose.yml
├── nginx.conf
└── dist/
```

`/DATA` is ZimaOS's storage area and is exposed over SMB and in the Files
app, so you can copy files there without SSH.

Then start it (web terminal at `http://192.168.1.187:7681`, or SSH if you
enable it):

```sh
cd /DATA/AppData/sahko-website
docker compose up -d
```

Verify it's serving before touching Cloudflare — from any machine on the
LAN:

```sh
curl -I http://192.168.1.187:8080
```

Expect `HTTP/1.1 200 OK` and `Server: nginx`. If you get a connection
refused, the container isn't up (`docker compose logs` will say why); if you
get Caddy/ZimaOS headers instead, you hit port 80 by mistake.

## 2. Build and copy the site

```sh
npm run build
```

Then copy the contents of `dist/` into `/DATA/AppData/sahko-website/dist/`
on the board — via the ZimaOS Files app, an SMB mount, or `rsync`/`scp` if
you've enabled SSH:

```sh
rsync -av --delete dist/ user@192.168.1.187:/DATA/AppData/sahko-website/dist/
```

nginx serves straight off disk, so new files are live immediately — no
restart needed. (`docker compose restart` is only needed if you change
`nginx.conf`.)

## 3. Point the tunnel at it

In the Cloudflare Zero Trust dashboard → Networks → Tunnels → your tunnel →
Public Hostname, add or confirm:

```
sahko.ie  →  http://192.168.1.187:8080
```

Use the **IP, not `localhost`** — see the container gotcha above.

Make sure the DNS record for `sahko.ie` is **proxied** (orange cloud) in
Cloudflare DNS — that's what puts Cloudflare's edge, caching, and rate
limiting in front of the tunnel instead of a plain passthrough.

## 4. Cloudflare settings to protect the origin

The site is static and public, so lean on Cloudflare's edge to absorb almost
all traffic rather than the box:

- **Cache Rules** (Rules → Cache Rules): create a rule matching
  `hostname eq "sahko.ie"` with "Eligible for cache" + a sensible Edge TTL
  (e.g. a few minutes) for the HTML pages. The CSS bundle under `/_astro/`
  is content-hashed and the other static assets (`site.js`, favicons) are
  shared across every page, so between this edge rule and
  [`nginx.conf`](nginx.conf)'s per-file-type headers, most repeat
  requests — including navigating between pages on the same visit — never
  reach the origin at all.
- **Security → WAF → Rate limiting rules**: throttle by IP (e.g. >100
  req/min) with a Challenge or Block action, so a traffic spike or scraper
  can't hammer the small board directly.
- **Bot Fight Mode** (Security → Bots): free tier, cuts a chunk of
  automated/scraper traffic before it reaches origin.

## Updating the site

Re-run step 2 (build, copy) — that's it.

## Troubleshooting

- **502/error page from Cloudflare** — the tunnel can't reach the origin.
  Check `curl -I http://192.168.1.187:8080` from the board's LAN, and that
  the ingress uses the IP rather than `localhost`.
- **Site loads but styling/JS missing** — `dist/` was copied incompletely;
  make sure `_astro/` and `site.js` came across.
- **Changes not showing** — Cloudflare edge cache. Purge it in the
  dashboard, or wait out the Edge TTL you set.
- **All visitors log as one internal IP** — `real_ip_header
  CF-Connecting-IP` in `nginx.conf` handles this, but only for traffic
  arriving through Cloudflare.
