# Deploying to the ZimaBoard

The site is fully static — `npm run build` produces `dist/`, and nginx just
serves those files. There's no runtime, no database, nothing for the server
to compute per request.

## The setup

```
git push
  → GitHub Actions builds the site + bakes it into a Docker image (Dockerfile)
  → publishes to ghcr.io
Internet → Cloudflare edge → cloudflared (ZimaOS app) → nginx container :8080
                                                              ↑
                                        Watchtower polls ghcr.io every 5 min,
                                        pulls + restarts nginx when it sees
                                        a new image
```

Deploys are push-to-deploy: commit, push to `master`, and the new version
reaches the board on its own within one Watchtower poll — no manual copy
step. SSH is disabled on the board, so GitHub Actions can't reach in
directly; publishing an image and having the board *pull* it is what makes
this work without SSH.

cloudflared and the site's containers all run on the ZimaBoard
(`192.168.1.187`). ZimaOS is Docker-first and its own Caddy gateway already
owns host port 80, which is why the site gets port **8080** instead.

**The container gotcha:** cloudflared runs in its own container, so
`localhost:8080` in its config points at *itself*, not the ZimaBoard. The
tunnel ingress must use the host's LAN IP (`192.168.1.187:8080`).

## 1. One-time: make the GHCR package public

The first push to `master` triggers [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml),
which publishes `ghcr.io/sahko123/sahko-website`. **New GitHub Container
Registry packages default to private** even in a public repo — Watchtower
pulling without credentials will get a 401/403 until this is flipped:

1. On GitHub → your profile → **Packages** → `sahko-website`
2. **Package settings** → **Change visibility** → **Public**

Do this once, right after the first successful Action run.

## 2. One-time: bring the board up

Create the app directory and drop in [`docker-compose.yml`](docker-compose.yml) —
this is the only file needed on the board now, since the image is
self-contained (site + nginx.conf both baked in by the Dockerfile):

```
/DATA/AppData/sahko-website/
└── docker-compose.yml
```

`/DATA` is ZimaOS's storage area and is exposed over SMB and in the Files
app, so you can copy the file there without SSH.

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

```sh
git push
```

That's it — steps 1–4 above are one-time setup, not part of the normal
update flow. Watchtower notices the new image within 5 minutes and restarts
the container automatically.

**Don't want to wait for the poll interval?** From the board's web terminal:

```sh
cd /DATA/AppData/sahko-website
docker compose pull sahko-website && docker compose up -d sahko-website
```

**Want to build and inspect the image without pushing?** From the repo root
(needs Docker installed — not verified from this environment, since Docker
wasn't available here to test):

```sh
docker build -t sahko-website .
docker run --rm -p 8080:8080 sahko-website
```

## Troubleshooting

- **502/error page from Cloudflare** — the tunnel can't reach the origin.
  Check `curl -I http://192.168.1.187:8080` from the board's LAN, and that
  the ingress uses the IP rather than `localhost`.
- **Pushed to master but the site didn't change** — check the Actions tab
  for a failed build first. If the build succeeded, check the GHCR package
  is Public (step 1) — Watchtower fails silently on a pull it can't
  authenticate for; `docker logs sahko-watchtower` on the board will show
  the 401/403 if that's it.
- **Site loads but styling/JS missing** — very unlikely now that the image
  is built by CI from a clean checkout every time, but if it happens, check
  the Actions log for the build step rather than anything on the board.
- **Changes not showing** — Cloudflare edge cache. Purge it in the
  dashboard, or wait out the Edge TTL you set.
- **All visitors log as one internal IP** — `real_ip_header
  CF-Connecting-IP` in `nginx.conf` handles this, but only for traffic
  arriving through Cloudflare.
