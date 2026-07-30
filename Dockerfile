# Multi-stage build: compile the static site, then serve it via nginx.
#
# Built by .github/workflows/deploy.yml on every push to master and
# published to ghcr.io — the ZimaBoard's Watchtower container polls for a
# new version and pulls + restarts automatically. See deploy/README.md for
# the one-time setup on the board.
#
# Self-contained on purpose: this image bakes in both the built site AND
# nginx.conf, so the board never needs its own copy of either — the whole
# deploy is "pull this image," not "also keep some files in sync by hand."

FROM node:22-alpine AS build
WORKDIR /app
# Copy just the manifest first so `npm ci` is Docker-layer-cached and only
# reruns when dependencies actually change, not on every source edit.
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Runs prebuild (esbuild-bundles src/site.client.js) then astro build —
# same `npm run build` as local/manual deploys, just executing here instead.
RUN npm run build

FROM nginx:1-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
