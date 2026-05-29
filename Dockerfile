# Multi-stage build for production deployment (pnpm workspaces)

# ---- Stage 1: Build — install workspace, build FE + BE, create prod bundle ----
FROM node:26-alpine AS build

# pnpm via corepack (version pinned by root package.json "packageManager")
RUN corepack enable
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
RUN pnpm --filter core-frontend-tanstack run build
RUN cp -r ayunis-core-frontend/dist ayunis-core-backend/frontend
RUN pnpm --filter core-backend run build

# Produce a self-contained, production-only deploy bundle for the backend
# workspace (prunes devDependencies; --legacy avoids the inject-workspace-packages
# requirement — no workspace package deps exist yet, AYC-148 revisits).
RUN pnpm --filter=core-backend --prod --legacy deploy /prod/backend

# ---- Stage 2: Production runtime ----
FROM node:26-alpine AS production

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
