# syntax=docker/dockerfile:1.7
#
# ONE production image that runs BOTH the Next.js frontend and the Node.js API in ONE container.
#
#   public :3000  ── Next.js standalone server (pages, static assets, media, PDF)
#                     └─ rewrites /api/*  ──►  127.0.0.1:4000  Node API (Fastify + SQLite)
#
# docker/start.mjs supervises both processes, forwards SIGTERM/SIGINT and exits if either dies.
# SQLite lives on the /data volume. Expo is not part of this image.

ARG NODE_IMAGE=node:24-alpine

# ---------- 1. install (dev deps included, for building) ----------
FROM ${NODE_IMAGE} AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
# Only the workspaces the server needs; the Expo app and root asset tooling are skipped.
RUN --mount=type=cache,target=/root/.npm \
    npm ci -w @rct/shared -w @rct/api -w @rct/web --no-audit --no-fund

# ---------- 2. build shared contracts, API and Next.js standalone ----------
FROM deps AS build
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    API_INTERNAL_URL=http://127.0.0.1:4000 \
    NEXT_TELEMETRY_DISABLED=1
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/web apps/web
RUN npm run build -w @rct/shared && npm run build -w @rct/api && npm run build -w @rct/web

# ---------- 3. production-only dependencies for the API ----------
FROM ${NODE_IMAGE} AS api-deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev -w @rct/shared -w @rct/api --no-audit --no-fund --ignore-scripts

# ---------- 4. runtime ----------
FROM ${NODE_IMAGE} AS runtime
RUN apk add --no-cache tini
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    API_PORT=4000 \
    API_HOST=127.0.0.1 \
    DATABASE_PATH=/data/reading.db
WORKDIR /app

# Next.js standalone server (+ static files and public assets it does not copy itself)
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./web
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./web/apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./web/apps/web/public

# API: compiled JS + production node_modules (with the @rct/shared workspace link)
COPY --from=api-deps --chown=node:node /repo/node_modules ./api/node_modules
COPY --from=build --chown=node:node /repo/packages/shared/package.json ./api/packages/shared/package.json
COPY --from=build --chown=node:node /repo/packages/shared/dist ./api/packages/shared/dist
COPY --from=build --chown=node:node /repo/apps/api/package.json ./api/apps/api/package.json
COPY --from=build --chown=node:node /repo/apps/api/dist ./api/apps/api/dist
# Public-domain reader texts (a local override in apps/api/content/local is docker-ignored)
COPY --from=build --chown=node:node /repo/apps/api/content ./api/apps/api/content

COPY --chown=node:node docker/start.mjs ./start.mjs

RUN mkdir -p /data && chown node:node /data
VOLUME ["/data"]
USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "start.mjs"]
