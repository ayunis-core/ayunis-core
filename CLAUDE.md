# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (ayunis-core-backend/)
```bash
# Development
cd ayunis-core-backend
npm run start:dev              # Start development server with hot reload
npm run docker:dev            # Start with Docker development environment

# Building and Production
npm run build                  # Build the NestJS application
npm run start:prod            # Start production server

# Testing
npm run test                   # Run unit tests
npm run test:watch            # Run tests in watch mode
npm run test:cov              # Run tests with coverage
npm run test:e2e              # Run end-to-end tests

# Linting and Formatting
npm run lint                   # Run ESLint with auto-fix
npm run format                # Format code with Prettier

# Database Operations
npm run migration:generate:dev "MigrationName"  # Generate new migration
npm run migration:run:dev      # Run pending migrations
npm run migration:revert:dev   # Revert last migration
npm run migration:show:dev     # Show migration status

# Frontend Bundling (for production build)
npm run bundle-frontend        # Bundle frontend assets into backend
```

### Frontend (ayunis-core-frontend/)
```bash
# Development
cd ayunis-core-frontend
npm run dev                    # Start development server on port 3001

# Building
npm run build                  # Build for production (includes TypeScript compilation)

# Testing
npm run test                   # Run tests with Vitest

# API Code Generation
npm run openapi:update         # Fetch OpenAPI schema and regenerate client
npm run openapi:fetch          # Fetch OpenAPI schema from backend
npm run openapi:generate       # Generate TypeScript client from schema
```

### Root Commands
```bash
# Production deployment
docker compose up -d --build   # Start full production stack
```

## Architecture Overview

### Backend Architecture
The backend uses **hexagonal architecture** with strict separation of concerns:

- **Domain Modules**: Located in `src/domain/`, each with standard structure:
  - `application/` - Use cases and ports (interfaces)
  - `domain/` - Core entities and business logic
  - `infrastructure/` - External system adapters
  - `presenters/` - HTTP controllers and DTOs
  - `<module>.module.ts` - NestJS module configuration

- **Core Domain Modules**:
  - `models/` - Multi-provider AI model management (OpenAI, Anthropic, Mistral, Ollama)
  - `rag/` - Retrieval Augmented Generation (embeddings, indexers, splitters)
  - `threads/` - Conversation session management
  - `sources/` - External data source management (files, URLs)
  - `tools/` - Extensible AI tool system with JSON schema validation
  - `agents/` - Configurable AI assistants with tool assignments
  - `runs/` - AI execution tracking and management

- **Identity & Access Management (`iam/`)**:
  - Multi-tenant organization management
  - JWT-based authentication with role-based access
  - Subscription and billing management
  - Legal acceptance tracking

### Frontend Architecture
React application using:
- **TanStack Router** for routing
- **TanStack Query** for server state management
- **Shadcn/ui** components with Radix UI primitives
- **Tailwind CSS** for styling
- **i18next** for internationalization (German/English)

Key directories:
- `src/pages/` - Page-level components organized by feature
- `src/widgets/` - Reusable UI widgets
- `src/shared/` - Shared utilities, API client, and UI components

## Development Guidelines

### Backend Development
- Follow hexagonal architecture patterns
- Use cases should contain pure business logic
- Infrastructure adapters handle external dependencies
- All interfaces represented as abstract classes when possible
- Configuration stored in `src/config/` and registered in `app.module.ts`

### Database
- Uses TypeORM with PostgreSQL
- Migrations are located in `src/db/migrations/`
- Entity definitions follow the domain structure
- Always generate migrations for schema changes

### Frontend Development
- Use Shadcn/ui components: `npx shadcn@latest add <component-name>`
- API client auto-generated from OpenAPI schema using Orval
- Feature-based organization with co-located API hooks, models, and UI
- Use TanStack Query for server state management

### Testing
- Backend: Jest for unit tests, separate e2e tests in `test/` directory
- Frontend: Vitest for testing
- Focus on use case testing for business logic

### Code Quality
- TypeScript strict mode enabled across the project
- ESLint configuration for consistent code style
- Prettier for code formatting
- Run lint and format commands before committing

## Multi-Provider AI Integration
The system supports multiple LLM providers through a unified interface:
- **Model Registry**: Central registration of available models
- **Provider Support**: OpenAI, Anthropic, Mistral, Ollama, Synaforce
- **Streaming**: Real-time response streaming capabilities
- **Permissions**: Organization-level model and provider permissions

## RAG Pipeline
Comprehensive document processing system:
- **Embeddings**: Multi-provider text vectorization
- **Indexing**: Parent-child chunking strategy for context preservation
- **Retrieval**: Semantic search with configurable parameters
- **Sources**: File upload and URL-based content ingestion

## Development Environment
- Node.js 18+ required
- Docker Compose for full development environment
- PostgreSQL database (via Docker or local)
- Environment files: `.env` in backend directory (copy from `.env.example`)
