---
name: dev-environment
description: Start, stop, and manage the local dev stack (Docker infra, backend, frontend). Works in any directory — worktree or main repo.
---

# Dev Environment

## Starting the Stack

The `./dev` script manages the full local development stack. It works from any checkout — worktree or main repo.

```bash
# Start everything (requires a slot number on first run)
./dev up --slot 2

# Subsequent runs remember the slot
./dev up
```

### What `./dev up` does

1. Starts Docker infrastructure (postgres, minio, mailcatcher, code-execution, anonymize)
2. Generates `.env.dev` with localhost connection config for the slot
3. Runs database migrations
4. Starts the backend natively (`nest start --watch`)
5. Starts the frontend natively (`vite`)
6. Waits for the backend health check, prints port summary, returns

## Port Reference

Ports are offset by `slot × 10`:

| Service  | Formula       | Slot 2 | Slot 3 | Slot 4 |
| -------- | ------------- | ------ | ------ | ------ |
| Backend  | 3000 + offset | 3020   | 3030   | 3040   |
| Frontend | 3001 + offset | 3021   | 3031   | 3041   |
| Postgres | 5432 + offset | 5452   | 5462   | 5472   |
| MinIO    | 9000 + offset | 9020   | 9030   | 9040   |

**Avoid slots 0 and 1** — their ports (5432, 3000, etc.) often conflict with existing services on the host.

## Checking Status and Logs

```bash
./dev status                      # Overview of all services
./dev logs backend                # Backend logs (last 80 lines)
./dev logs frontend               # Frontend logs
./dev logs infra                  # Docker infrastructure logs
./dev logs --tail 200 backend     # More lines
```

## Restarting

The backend runs `nest start --watch` — it auto-reloads on code changes. If it crashes:

```bash
./dev logs backend    # Check what went wrong
./dev down
./dev up              # Slot is remembered
```

## Stopping

```bash
./dev down
```

## Troubleshooting

If `./dev up` fails, check logs:

```bash
./dev logs backend
./dev logs infra
```
