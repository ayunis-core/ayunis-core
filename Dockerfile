# Multi-stage build for production deployment (pnpm workspaces)

# ---- Stage 1: Build — install workspace, build FE + BE, create prod bundle ----
# Pinned back to node 24 to bisect the production outbound-connection stalls
# that started with the node 26 bump (AYC-423). Revert to 26 once exonerated
# or once the stall mechanism is identified and mitigated.
FROM node:24.16.0-alpine AS build

# pnpm via corepack (version pinned by root package.json "packageManager").
# Installed explicitly (node:26-alpine dropped the bundled corepack; harmless
# on node:24, and keeps this line stable across the 24↔26 A/B).
RUN npm install -g corepack@latest && corepack enable
# Native build deps for bcrypt (node-pre-gyp builds from source on musl/alpine)
RUN apk add --no-cache python3 make g++ gcc

# Skip husky in the image (no .git here; prepare script would otherwise run)
ENV HUSKY=0

WORKDIR /usr/src/app

# Copy the whole workspace. The root .dockerignore prunes node_modules, build
# outputs, .env files, the Python services, and tooling.
COPY . .

# Install the full workspace, frozen to the committed lockfile.
RUN pnpm install --frozen-lockfile

# Build the frontend, then bundle it where the backend serves it from: a sibling
# of dist/ (so nest's deleteOutDir doesn't wipe it), copied into dist/frontend in
# the final stage. Then build the backend.
#
# The frontend .env enters the build context via a .dockerignore exception, so Vite
# auto-loads it and inlines every VITE_* var at build time — no per-variable ARG/ENV
# plumbing. Unlike a BuildKit secret mount (whose contents are excluded from the
# layer cache key), the file is part of the context, so changing a value correctly
# invalidates this layer instead of reusing a stale, previously-inlined bundle. It
# lives only in this discarded build stage; the production image copies the built
# dist, never the .env. The echo surfaces which VITE_* vars are present (names only)
# so a missing one shows up in build logs rather than silently inlining as undefined.
RUN echo "Frontend VITE_* vars present at build:" \
 && (grep -oE '^VITE_[A-Z0-9_]+=' ayunis-core-frontend/.env 2>/dev/null | sort \
     || echo "  (none — VITE_* will be inlined as undefined)") \
 && pnpm --filter core-frontend-tanstack run build
RUN cp -r ayunis-core-frontend/dist ayunis-core-backend/frontend
# Build the workspace packages the backend depends on (@ayunis/inference,
# @ayunis/provider-anthropic, @ayunis/provider-openai, @ayunis/agent-runtime)
# before the backend so their dist/ exists when nest build resolves them. pnpm
# orders @ayunis/inference ahead of @ayunis/agent-runtime (which depends on it).
# The backend's `prebuild` hook also runs this, but doing it explicitly keeps
# the build order legible.
RUN pnpm --filter "@ayunis/inference" --filter "@ayunis/provider-anthropic" --filter "@ayunis/provider-openai" --filter "@ayunis/agent-runtime" run build
RUN pnpm --filter core-backend run build

# Produce a self-contained, production-only deploy bundle for the backend
# workspace (prunes devDependencies). --legacy uses the pre-inject deploy
# algorithm, which hard-copies the @ayunis/* workspace dependencies (built
# above) into the bundle's node_modules — so no inject-workspace-packages
# setting is required.
RUN pnpm --filter=core-backend --prod --legacy deploy /prod/backend

# ---- Stage 2: Production runtime ----
FROM node:24.16.0-alpine AS production

# Chromium for Puppeteer PDF export
RUN apk add --no-cache chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Production node_modules + manifest from the deploy bundle (bcrypt already built
# during install on this same alpine platform). Built backend + bundled frontend
# copied explicitly (dist is git-ignored, so the deploy bundle omits it).
COPY --from=build /prod/backend/node_modules ./node_modules
COPY --from=build /prod/backend/package.json ./package.json
COPY --from=build /usr/src/app/ayunis-core-backend/dist ./dist
COPY --from=build /usr/src/app/ayunis-core-backend/frontend ./dist/frontend

# Uploads dir (resolved relative to cwd = /app at runtime; matches the
# app-uploads:/app/uploads compose mount)
RUN mkdir -p uploads

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=3072"
# PORT is set via environment variable at runtime, defaults to 3000 in app code
# Port exposure is handled by docker-compose port mapping

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application (cwd /app → dist/frontend served, ./uploads = /app/uploads)
CMD ["node", "dist/src/main.js"]
