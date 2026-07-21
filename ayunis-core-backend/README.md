# Ayunis Core Backend

A NestJS backend application built with hexagonal architecture for the Ayunis platform.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Setup and Installation](#setup-and-installation)
  - [Development Environment](#development-environment)
  - [Production Environment](#production-environment)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Project Structure](#project-structure)
  - [Hexagonal Architecture](#hexagonal-architecture)
  - [Domain Modules](#domain-modules)
- [API Documentation](#api-documentation)
- [Testing](#testing)

## Overview

This is the core backend for the Ayunis platform, built with NestJS and following hexagonal architecture principles. It provides REST APIs for various domain features including threads, messages, models, runs, and tools.

## Prerequisites

- Node.js (v24+)
- npm or yarn
- Docker and Docker Compose
- PostgreSQL with pgvector extension

## Setup and Installation

1. Clone the repository
2. Set up environment configuration — two paths:

   **Team members (Infisical):** the complete dev config (secrets + base
   connection config) is injected from Infisical at process start — no local
   env files needed.

   ```bash
   brew install infisical/get-cli/infisical
   infisical login   # pick the Ayunis instance domain, log in as yourself
   ```

   **Contributors without Infisical access:** copy the example file and fill
   in your values; `./dev` detects the missing Infisical setup and falls back
   to `.env` automatically.

   ```bash
   cp .env.example .env
   ```

### Development Environment

From the **repository root**:

```bash
./dev up            # Start infra (Docker) + backend + frontend in background
./dev status        # Check what's running
./dev logs backend  # View backend logs
./dev down          # Stop everything
```

Use `./dev up --slot 1` to run a second instance in parallel (e.g. for another worktree).

Environment precedence and the `DEV_PORT_OFFSET` slot derivation are
documented in `src/config/SUMMARY.md`. Useful to know:

- **Manual commands that need secrets** (Infisical path) must be prefixed,
  because the DB config no longer lives in a local file:
  `infisical run --env=dev --path=/backend -- pnpm seed` (same for
  `pnpm run cli` and `pnpm run migration:*:dev`).
- **Personal overrides:** to change a shared value just for yourself (a
  feature flag, a temporary API key), set a *personal override* on the secret
  in the Infisical UI — the CLI resolves it automatically. Offline
  alternative: a gitignored `.env.local`, which beats every other source.
- **Secrets are fetched at process start** — after changing a value in
  Infisical, restart via `./dev down && ./dev up`.
- `AYUNIS_NO_INFISICAL=1 ./dev up` forces the local `.env` fallback.

### Production Environment

Using Docker:

```bash
docker-compose up -d
```

Manual setup:

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start the production server
npm run start:prod
```

## Environment Variables

Check `.env.example` for necessary environment variables

```text
# Database

POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ayunis

# Mistral API

MISTRAL_API_KEY=your_mistral_api_key
```

## Database Migrations

The application uses TypeORM for database migrations:

```bash
# Generate a migration (development)
pnpm run migration:generate:dev src/db/migrations/MigrationName

# Run migrations (development)
pnpm run migration:run:dev

# Revert migrations (development)
pnpm run migration:revert:dev

# Show migration status (development)
pnpm run migration:show:dev

# Production migration commands
pnpm run migration:generate:prod src/db/migrations/MigrationName
pnpm run migration:run:prod
pnpm run migration:revert:prod
pnpm run migration:show:prod
```

## Project Structure

The application follows a hexagonal (ports and adapters) architecture.

### Hexagonal Architecture

The project structure follows the hexagonal architecture pattern:

```text
src/
├── domain/                  # Domain modules
│   ├── <module>/            # Domain module
│   │   ├── domain/          # Domain model and business logic
│   │   ├── application/     # Application services, commands, queries
│   │   │   ├── ports/       # Ports (interfaces) for the adapters
│   │   │   ├── commands/    # Command handlers
│   │   │   └── queries/     # Query handlers
│   │   ├── infrastructure/  # Adapters (implementations)
│   │   │   ├── handler/    # Adapter for handling logic
│   │   │   └── persistence/ # Database adapters
│   │   └── presenters/      # Controllers, DTOs
│   │       └── http/        # HTTP controllers
│   └── ...
├── common/                  # Shared utilities, filters, pipes
├── config/                  # Application configuration
├── db/                      # Database migrations, datasource
├── iam/                     # Identity and Access Management
├── app/                     # Main application module
└── main.ts                  # Application entry point
```

### Domain Modules

The application is organized into domain modules:

- **threads**: Conversation threads
- **messages**: Messages within threads
- **models**: AI models
- **runs**: Execution runs
- **tools**: Tools used by the AI models

Each domain module follows the same structure with:

1. **Domain Layer**: Contains the business logic and domain models
2. **Application Layer**: Contains services, commands, and queries that orchestrate the domain logic
3. **Infrastructure Layer**: Contains adapters that implement the ports defined in the application layer
4. **Presenters Layer**: Contains controllers that handle HTTP requests and responses

## API Documentation

The API documentation is available at `/api` using Swagger UI when the application is running.

## Testing

```bash
# Run unit tests
npm run test

# Generate test coverage report
npm run test:cov
```
