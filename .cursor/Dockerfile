# Base image for Cursor Cloud Agents running ayunis-core.
#
# Cursor builds this image and checks out the repository itself, so we do NOT
# COPY the repo here — we only provision the toolchain + native services
# (Postgres+pgvector, Redis, MinIO). Dependency install, DB init, migrations
# and seeding happen in .cursor/install.sh; daemons are launched by
# .cursor/start.sh. See .cursor/README.md for the design rationale.
FROM node:24-bookworm

ENV DEBIAN_FRONTEND=noninteractive

# --- System packages -------------------------------------------------------
# build-essential + python3 : native module builds (bcrypt, esbuild)
# redis-server               : lean queue/cache service
# curl/gnupg/ca-certificates : fetch PGDG key + MinIO binary
# openssl/lsof/tmux/git      : secret generation + tooling the dev flow expects
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential python3 git curl ca-certificates gnupg openssl lsof tmux \
      redis-server \
 && rm -rf /var/lib/apt/lists/*

# --- PostgreSQL 16 + pgvector (from the official PGDG apt repo) -------------
RUN install -d /usr/share/postgresql-common/pgdg \
 && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
      -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
 && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
      > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update && apt-get install -y --no-install-recommends \
      postgresql-16 postgresql-16-pgvector \
 && rm -rf /var/lib/apt/lists/*

# NOTE: we intentionally do NOT expose the Postgres 16 server binaries
# (initdb, pg_ctl, pg_isready, …) via `ENV PATH` here. Cursor's runtime shell
# does not inherit the image ENV, and `runuser` resets PATH for the postgres
# user — so an ENV PATH would never reach install.sh/start.sh. common.sh
# resolves /usr/lib/postgresql/*/bin explicitly instead.

# --- MinIO server binary ---------------------------------------------------
# NOTE: amd64 assumed (Cursor cloud). For arm64, swap linux-amd64 -> linux-arm64.
RUN curl -fsSL https://dl.min.io/server/minio/release/linux-amd64/minio \
      -o /usr/local/bin/minio \
 && chmod +x /usr/local/bin/minio

# --- pnpm via corepack (pinned to the repo's packageManager) ---------------
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

# --- Data directory --------------------------------------------------------
# World-writable parent so the daemons initialise under whatever user Cursor
# runs the agent as. install.sh creates /data/pg with the right owner+perms.
RUN mkdir -p /data && chmod 777 /data
