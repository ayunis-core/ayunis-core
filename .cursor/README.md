# Cursor Cloud Agent environment

This directory configures the environment Cursor Cloud Agents boot into for
this repo, via [`environment.json`](https://cursor.com/docs/cloud-agent/setup).
The goal: an agent lands in a **running, log-in-able Ayunis Core** — able to
edit code, run the backend + frontend live, and validate changes — without any
manual setup.

## Design: lean, native services (no Docker)

Local dev (`./dev up`) runs **7 Docker containers**. That's more than a coding
agent needs. The backend's only **hard boot requirements** are:

- **Postgres (with pgvector)** — the one service whose absence crashes boot.
- **`MCP_ENCRYPTION_KEY`** (64-hex) — the one env var that crashes boot.

`/api/health` is a static `200` (checks nothing external), there's no config
validation schema (so `JWT_SECRET`/`COOKIE_SECRET` have dev defaults), and
provider API keys load lazily. So instead of Docker-in-Docker we install the
lean set — **Postgres+pgvector, Redis, MinIO** — **natively** into the base
image and run them as plain background processes. This is the lightest, fastest,
least-fragile option.

- **Redis** is included to silence connection-error spam and enable document
  processing.
- **MinIO** is included so file/document storage works and boot isn't delayed by
  the storage provider's retry loop.

### Degraded (lazy, feature-only) services — intentionally omitted

Gotenberg (office→PDF), Mailcatcher (dev email), the code-execution tool, and
the anonymize service are contacted only when their feature runs. The app boots
and runs fine without them; those specific endpoints will error if hit. There is
no app-level toggle to disable them — omission just means they aren't running.

## Files

| File | Role |
| ---- | ---- |
| `Dockerfile` | Base image: Node 24 + pnpm, Postgres 16 + pgvector, Redis, MinIO binary. Cursor builds it and checks out the repo itself (we don't `COPY` it). |
| `environment.json` | `build` (Dockerfile) + `install` + `start` + `terminals` (backend `:3000`, frontend `:3001`). |
| `install.sh` | One-time, snapshot-cached: `pnpm install`, `build:deps`, init Postgres, write `.env`, migrate, seed. Idempotent. |
| `start.sh` | Per-boot: launch Postgres/Redis/MinIO, ensure migrate+seed. Self-heals if the snapshot didn't persist state. |
| `common.sh` | Shared shell helpers sourced by both scripts. |

## Secrets (set in the Cursor dashboard → Settings → Secrets)

None are required to **boot**, but for inference to actually work set at least
one provider key. `install.sh`/`start.sh` inject these into the backend `.env`
when present:

- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `MISTRAL_API_KEY`, `GEMINI_API_KEY`

`MCP_ENCRYPTION_KEY`, `JWT_SECRET`, and `COOKIE_SECRET` are **auto-generated**
(and preserved across idempotent re-runs), so they need not be set as secrets.
They differ per fresh environment — fine for ephemeral agents.

## Seeded login

`pnpm run seed:ts` (idempotent) creates a demo org + admin:

- **Email:** `admin@demo.local`
- **Password:** `admin`

## Verifying / iterating

1. **Local sanity** (before pushing): `bash -n .cursor/*.sh`, and optionally
   `docker build -f .cursor/Dockerfile .cursor/../` to confirm the image builds.
2. **Real end-to-end**: push a branch with `.cursor/` and launch a Cloud Agent
   on it. Confirm the image builds → `install` completes → `start` brings the
   daemons up → backend answers `GET localhost:3000/api/health` →
   frontend serves on `:3001` → login with the seeded creds works. Edit
   `.cursor/*` and re-run; the `install` snapshot keeps later boots fast.

## Open items to confirm on the first real run

- **Agent user** (root vs non-root): the scripts adapt (`runuser -u postgres`
  when root, direct otherwise), but verify Postgres starts cleanly.
- **Snapshot persistence** of `/data/pg`: if it isn't preserved, `start.sh`
  re-initialises and re-migrates automatically (slower first boot only).
- **CPU arch**: the MinIO binary URL assumes `amd64`; switch to `linux-arm64`
  in the Dockerfile if Cursor runs arm64.
