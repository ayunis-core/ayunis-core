# Architecture

**2-word:** AI Gateway

**8-word:** Multi-tenant AI gateway with agents, tools, and RAG.

**32-word:** Ayunis Core is an open-source AI gateway enabling municipalities to run customizable AI assistants with multi-provider LLM support, tool integration, document retrieval (RAG), and organization-scoped access control. Hexagonal architecture separates domain logic from infrastructure.

---

## Repository Structure

```
ayunis-core/
├── ayunis-core-backend/       # NestJS API server
├── ayunis-core-frontend/      # React SPA (Feature-Sliced Design)
├── ayunis-core-code-execution/# Sandboxed code execution microservice
├── ayunis-core-anonymize/     # PII anonymization service
├── ayunis-core-e2e-ui-tests/  # Cypress E2E tests
├── ARCHITECTURE.md            # This file
├── AGENTS.md                  # AI coding agent guidelines
└── docker-compose.yml         # Local dev infrastructure
```

---

## Backend (NestJS + Hexagonal Architecture)

📁 **[`ayunis-core-backend/src/`](ayunis-core-backend/src/)**

### Domain Modules — Core Business Logic

| Module | Summary | Detail |
|--------|---------|--------|
| [agents](ayunis-core-backend/src/domain/agents/SUMMARY.md) | AI Assistants | Configurable AI agents with tools and sources |
| [threads](ayunis-core-backend/src/domain/threads/SUMMARY.md) | Conversations | Chat session management with organization sharing |
| [messages](ayunis-core-backend/src/domain/messages/SUMMARY.md) | Chat History | Message storage and retrieval |
| [runs](ayunis-core-backend/src/domain/runs/SUMMARY.md) | AI Execution | LLM request tracking and streaming |
| [models](ayunis-core-backend/src/domain/models/SUMMARY.md) | LLM Config | Multi-provider model management |
| [tools](ayunis-core-backend/src/domain/tools/SUMMARY.md) | Capabilities | Extensible tool system with JSON schema |
| [prompts](ayunis-core-backend/src/domain/prompts/SUMMARY.md) | Templates | Reusable prompt library |
| [sources](ayunis-core-backend/src/domain/sources/SUMMARY.md) | Documents | File and URL data sources |
| [rag](ayunis-core-backend/src/domain/rag/SUMMARY.md) | Retrieval | Embeddings, chunking, semantic search |
| [retrievers](ayunis-core-backend/src/domain/retrievers/SUMMARY.md) | Search | File, URL, and internet search retrieval |
| [storage](ayunis-core-backend/src/domain/storage/SUMMARY.md) | Files | MinIO-based file storage |
| [mcp](ayunis-core-backend/src/domain/mcp/SUMMARY.md) | Integrations | Model Context Protocol server connections |
| [shares](ayunis-core-backend/src/domain/shares/SUMMARY.md) | Sharing | Organization-wide resource sharing |
| [transcriptions](ayunis-core-backend/src/domain/transcriptions/SUMMARY.md) | Voice | Audio transcription service |
| [usage](ayunis-core-backend/src/domain/usage/SUMMARY.md) | Metering | Token and credit usage tracking |

### IAM Modules — Identity & Access Management

| Module | Summary | Detail |
|--------|---------|--------|
| [authentication](ayunis-core-backend/src/iam/authentication/SUMMARY.md) | User Auth | Login, registration, JWT tokens |
| [authorization](ayunis-core-backend/src/iam/authorization/SUMMARY.md) | Access Control | Role-based guards |
| [users](ayunis-core-backend/src/iam/users/SUMMARY.md) | Accounts | User profiles and credentials |
| [orgs](ayunis-core-backend/src/iam/orgs/SUMMARY.md) | Tenants | Multi-tenant organization management |
| [subscriptions](ayunis-core-backend/src/iam/subscriptions/SUMMARY.md) | Billing | Package and subscription management |
| [quotas](ayunis-core-backend/src/iam/quotas/SUMMARY.md) | Limits | Usage quota enforcement |
| [teams](ayunis-core-backend/src/iam/teams/SUMMARY.md) | Groups | Team-based access control |
| [invites](ayunis-core-backend/src/iam/invites/SUMMARY.md) | Onboarding | User invitation flows |
| [trials](ayunis-core-backend/src/iam/trials/SUMMARY.md) | Trial Access | Free trial management |
| [legal-acceptances](ayunis-core-backend/src/iam/legal-acceptances/SUMMARY.md) | Compliance | Terms acceptance tracking |
| [hashing](ayunis-core-backend/src/iam/hashing/SUMMARY.md) | Security | Password hashing |

### Infrastructure & Support

| Module | Summary | Detail |
|--------|---------|--------|
| [common](ayunis-core-backend/src/common/SUMMARY.md) | Shared Infrastructure | Base classes, utilities, cross-cutting concerns |
| [admin](ayunis-core-backend/src/admin/SUMMARY.md) | Platform Admin | Super admin routes for platform management |
| [app](ayunis-core-backend/src/app/SUMMARY.md) | Bootstrap | Application initialization |
| [config](ayunis-core-backend/src/config/SUMMARY.md) | Configuration | Environment config modules |
| [db](ayunis-core-backend/src/db/SUMMARY.md) | Database | Migrations, fixtures, TypeORM setup |
| [cli](ayunis-core-backend/src/cli/SUMMARY.md) | Commands | CLI utilities for ops |

---

## Frontend (React + Feature-Sliced Design)

📁 **[`ayunis-core-frontend/src/`](ayunis-core-frontend/src/SUMMARY.md)**

| Layer | Summary | Detail |
|-------|---------|--------|
| [pages](ayunis-core-frontend/src/pages/SUMMARY.md) | Routes | Auth, chat, agents, prompts, settings |
| [features](ayunis-core-frontend/src/features/SUMMARY.md) | Business Logic | Theme, language, models, usage tracking |
| [widgets](ayunis-core-frontend/src/widgets/SUMMARY.md) | Composites | Sidebar, chat input, markdown renderer |
| [shared](ayunis-core-frontend/src/shared/SUMMARY.md) | Primitives | UI components, generated API client, i18n |

---

## Key Architectural Patterns

### Hexagonal Architecture (Backend)

```
┌──────────────────────────────────────────────────────────────┐
│                        Presenters                            │
│                   (HTTP Controllers)                         │
├──────────────────────────────────────────────────────────────┤
│                        Application                           │
│              (Use Cases, Ports, Commands)                    │
├──────────────────────────────────────────────────────────────┤
│                         Domain                               │
│                  (Entities, Value Objects)                   │
├──────────────────────────────────────────────────────────────┤
│                      Infrastructure                          │
│              (Repositories, External APIs)                   │
└──────────────────────────────────────────────────────────────┘
```

- **Domain entities**: Pure TypeScript, no TypeORM decorators
- **Ports**: Abstract classes in `application/ports/`
- **Adapters**: Concrete implementations in `infrastructure/`
- **Records**: TypeORM entities in `infrastructure/persistence/postgres/schema/`

### Feature-Sliced Design (Frontend)

```
pages → widgets → features → shared
  ↓        ↓         ↓          ↓
Routes  Composites  Logic    Primitives
```

Import rules: layers only depend on layers to their right.

---

## Quick Navigation

- **Adding a backend feature**: Start at the relevant domain module's SUMMARY.md
- **Adding a frontend page**: See [pages/SUMMARY.md](ayunis-core-frontend/src/pages/SUMMARY.md)
- **Understanding auth**: [authentication](ayunis-core-backend/src/iam/authentication/SUMMARY.md) + [authorization](ayunis-core-backend/src/iam/authorization/SUMMARY.md)
- **AI execution flow**: [agents](ayunis-core-backend/src/domain/agents/SUMMARY.md) → [runs](ayunis-core-backend/src/domain/runs/SUMMARY.md) → [messages](ayunis-core-backend/src/domain/messages/SUMMARY.md)
