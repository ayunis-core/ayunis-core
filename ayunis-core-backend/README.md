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
2. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

3. Update the `.env` file with your specific configuration values

### Development Environment

From the **repository root**:

```bash
./dev up            # Start infra (Docker) + backend + frontend in background
./dev status        # Check what's running
./dev logs backend  # View backend logs
./dev down          # Stop everything
```

Use `./dev up --slot 1` to run a second instance in parallel (e.g. for another worktree).

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

### Manual QA: PDF parsing via web fetch (AYC-266)

URLs that resolve to a PDF are parsed through the file-retrieval pipeline (Mistral
OCR or `pdf-parse`) instead of being rejected. Two user-facing flows share the same
URL retriever, so both can be checked from the running app — there is no direct
fetch endpoint.

| Flow | Where | Route |
| ---- | ----- | ----- |
| `website_content` tool (single fetch) | Chat — `/chats/$threadId`: ask the assistant to read/summarize a PDF link | `POST /api/runs/send-message` |
| Knowledge-base URL crawl | KB detail — `/knowledge-bases/$id` → **Add URL** | `POST /api/knowledge-bases/{id}/urls` (`{ "url": "...", "maxDepth": 0 }`) |

**Expected before/after** (run the old revision vs. this branch):

- **KB, direct PDF URL, `maxDepth: 0`** — before: the source ends **FAILED** (the PDF
  is rejected as an unsupported content type, and a root failure aborts the crawl);
  after: the source reaches **READY** with the PDF text indexed. This is the clearest
  check — the status flips in the documents list with no log digging.
- **KB, an HTML page linking a same-site PDF, `maxDepth: 1`** — before: the PDF child
  page is silently skipped; after: its text is indexed alongside the HTML.
- **Chat** — before: the assistant reports it cannot read the link; after: it
  summarizes the extracted PDF text.

Test inputs: a small text PDF such as
`https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`; for the
generic-content-type path, any URL whose path ends in `.pdf` but is served as
`application/octet-stream`.

To compare revisions side by side, run two dev slots (e.g. `./dev up --slot 0` on the
base revision and `./dev up --slot 1` on this branch in a separate worktree) and hit
`localhost:3000` vs. `localhost:3010`.
