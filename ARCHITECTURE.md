# Architecture

**2-word:** AI Gateway

**8-word:** Multi-tenant AI gateway with skills, tools, and RAG.

**32-word:** Ayunis Core is an open-source AI gateway enabling municipalities to run customizable AI assistants with multi-provider LLM support, tool integration, document retrieval (RAG), and organization-scoped access control. Hexagonal architecture separates domain logic from infrastructure.

---

## Repository Structure

```text
ayunis-core/
├── ayunis-core-backend/       # NestJS API server
├── ayunis-core-frontend/      # React SPA (Feature-Sliced Design)
├── ayunis-core-code-execution/# Sandboxed code execution microservice
├── ayunis-core-anonymize/     # PII anonymization service
├── packages/inference/        # Provider-neutral inference contracts
├── packages/agent-runtime/    # Generic model/tool execution loop
├── packages/agent-extensions/ # Run-scoped capability definitions
├── packages/agent-harness/    # Runnable agents and private extension engine
├── packages/ui/               # Shared React design-system primitives
├── ARCHITECTURE.md            # This file
├── AGENTS.md                  # AI coding agent guidelines
└── docker-compose.yml         # Local dev infrastructure
```

---

## Agent SDK

The Agent SDK has one-way package dependencies:

```text
@ayunis/inference
        ↑
@ayunis/agent-runtime
        ↑
@ayunis/agent-extensions
        ↑
@ayunis/agent-harness
```

- **`@ayunis/inference`** defines provider-neutral messages, schemas, request
  contracts, and streamed provider output.
- **`@ayunis/agent-runtime`** executes a resolved model request loop. It knows
  about messages, models, tools, hooks, run context, and child execution, but
  not extensions, skills, agents, tenants, or persistence.
- **`@ayunis/agent-extensions`** defines run-scoped extension contracts and the
  foundational KnowledgeBases, MCP, and Skills capabilities. Definitions own
  setup and pure contribution logic, not execution orchestration.
- **`@ayunis/agent-harness`** exposes immutable runnable agents through
  `createAgent()`, `.variant()`, and `.run()`. Each run creates the private
  extension engine that performs ordered setup, typed API registration,
  transactional activation, contribution reconciliation, collision checks,
  child-run isolation, and reverse-order cleanup before delegating to the
  runtime.

Host applications remain responsible for model selection and credentials,
authorization, tenancy, persistence, knowledge retrieval, MCP connection
resolution and transports, messages, durable capability state, and consuming
run events. Those concerns enter through callbacks, tools, `RunContext`, and run
inputs; the SDK packages do not depend on Ayunis Core infrastructure.

There are no separate public profile, harness registry, extension engine,
session runner, or agent state-store APIs. Shared routing, policy, resource
lifecycle, or durable-instance abstractions should be introduced only when a
concrete host requirement needs them.

Runtime extensions are not **Agent Plugins**. Agent Plugins v1 is a portable
filesystem package standard centered on `plugin.json`, Agent Skills, and
`mcp.json`. A future loader may adapt that format into runtime extensions, but
none of these packages implements the Agent Plugins standard.

---

## Backend (NestJS + Hexagonal Architecture)

📁 **[`ayunis-core-backend/src/`](ayunis-core-backend/src/)**

### Domain Modules — Core Business Logic

| Module | Summary | Detail |
| ------ | ------- | ------ |
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
| [skill-templates](ayunis-core-backend/src/domain/skill-templates/SUMMARY.md) | Blueprints | Admin-managed skill templates with distribution modes |
| [academy](ayunis-core-backend/src/domain/academy/SUMMARY.md) | Learning | Academy chapters and lessons managed by super admins |
| [anonymization-settings](ayunis-core-backend/src/domain/anonymization-settings) | Privacy Config | Org-level PII whitelist for anonymous mode |
| [thread-pii-masks](ayunis-core-backend/src/domain/thread-pii-masks/SUMMARY.md) | Privacy | Per-thread PII mask dictionary for anonymous mode |
| [favorites](ayunis-core-backend/src/domain/favorites/SUMMARY.md) | Favorites | User-owned ordered references resolved for navigation |
| [workspaces](ayunis-core-backend/src/domain/workspaces/SUMMARY.md) | Folders | Personal project folders ("Projekte") that group chats and attach skills, knowledge, documents and instructions |

### IAM Modules — Identity & Access Management

| Module | Summary | Detail |
| ------ | ------- | ------ |
| [authentication](ayunis-core-backend/src/iam/authentication/SUMMARY.md) | User Auth | Login, registration, JWT tokens |
| [authorization](ayunis-core-backend/src/iam/authorization/SUMMARY.md) | Access Control | Role & permission guards |
| [permissions](ayunis-core-backend/src/iam/permissions/SUMMARY.md) | RBAC | Per-org role/permission grants (MANAGER/USER configurable) |
| [users](ayunis-core-backend/src/iam/users/SUMMARY.md) | Accounts | User profiles and credentials |
| [orgs](ayunis-core-backend/src/iam/orgs/SUMMARY.md) | Tenants | Multi-tenant organization management |
| [subscriptions](ayunis-core-backend/src/iam/subscriptions/SUMMARY.md) | Billing | Package and subscription management |
| [addons](ayunis-core-backend/src/iam/addons/SUMMARY.md) | Add-ons | Per-org add-on activation managed by super admins |
| [academy-access](ayunis-core-backend/src/iam/academy-access/SUMMARY.md) | Access Gate | Per-org KI-Führerschein certificate requirement for the chat surface |
| [quotas](ayunis-core-backend/src/iam/quotas/SUMMARY.md) | Limits | Usage quota enforcement |
| [credit-limits](ayunis-core-backend/src/iam/credit-limits/SUMMARY.md) | Limits | Per-user, per-team, and per-API-key monthly credit allowances |
| [budget-alerts](ayunis-core-backend/src/iam/budget-alerts/SUMMARY.md) | Alerts | Budget-warning and budget-exhausted emails when credit budgets cross usage thresholds |
| [teams](ayunis-core-backend/src/iam/teams/SUMMARY.md) | Groups | Team-based access control |
| [invites](ayunis-core-backend/src/iam/invites/SUMMARY.md) | Onboarding | User invitation flows |
| [trials](ayunis-core-backend/src/iam/trials/SUMMARY.md) | Trial Access | Free trial management |
| [legal-acceptances](ayunis-core-backend/src/iam/legal-acceptances/SUMMARY.md) | Compliance | Terms acceptance tracking |
| [onboarding](ayunis-core-backend/src/iam/onboarding/SUMMARY.md) | Onboarding | Per-user onboarding progress |
| [hashing](ayunis-core-backend/src/iam/hashing/SUMMARY.md) | Security | Password hashing |
| [ip-allowlist](ayunis-core-backend/src/iam/ip-allowlist/SUMMARY.md) | Network Security | Per-organization IP allowlist enforcement |
| [sso](ayunis-core-backend/src/iam/sso/SUMMARY.md) | Federated Identity | Municipal SSO connections and broker identity mappings |

### Infrastructure & Support

| Module | Summary | Detail |
| ------ | ------- | ------ |
| [common](ayunis-core-backend/src/common/SUMMARY.md) | Shared Infrastructure | Base classes, utilities, cross-cutting concerns |
| [integrations](ayunis-core-backend/src/integrations/SUMMARY.md) | External Integrations | Prometheus metrics and outbound webhook delivery |
| [admin](ayunis-core-backend/src/admin/SUMMARY.md) | Platform Admin | Super admin routes for platform management |
| [app](ayunis-core-backend/src/app/SUMMARY.md) | Bootstrap | Application initialization |
| [config](ayunis-core-backend/src/config/SUMMARY.md) | Configuration | Environment config modules |
| [db](ayunis-core-backend/src/db/SUMMARY.md) | Database | Migrations, fixtures, TypeORM setup |
| [cli](ayunis-core-backend/src/cli/SUMMARY.md) | Commands | CLI utilities for ops |

---

## Frontend (React + Feature-Sliced Design)

📁 **[`ayunis-core-frontend/src/`](ayunis-core-frontend/src/SUMMARY.md)**

Application-independent components and theme tokens live in the private
[`@ayunis/ui`](packages/ui/README.md) workspace package. The frontend's
`shared` layer contains application-aware shared components and consumes the UI
package as its design-system foundation.

| Layer | Summary | Detail |
| ----- | ------- | ------ |
| [pages](ayunis-core-frontend/src/pages/SUMMARY.md) | Routes | Auth, chat, skills, knowledge bases, settings |
| [features](ayunis-core-frontend/src/features/SUMMARY.md) | Business Logic | Theme, language, models, usage tracking |
| [widgets](ayunis-core-frontend/src/widgets/SUMMARY.md) | Composites | Sidebar, chat input, markdown renderer |
| [shared](ayunis-core-frontend/src/shared/SUMMARY.md) | Shared application infrastructure | Generated API client, i18n, app-aware components |

---

## Key Architectural Patterns

### Hexagonal Architecture (Backend)

```text
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

```text
pages → widgets → features → shared
  ↓        ↓         ↓          ↓
Routes  Composites  Logic    Primitives
```

Import rules: layers only depend on layers to their right.

### Authorization & RBAC

Two independent axes gate every request, both bound globally as `APP_GUARD`s in
[`iam.module.ts`](ayunis-core-backend/src/iam/iam.module.ts) (order is
load-bearing):

- **Role** — `UserRole` is `ADMIN | MANAGER | USER` (org-level, on the user).
  `@Roles(...)` + `RolesGuard` do a plain OR-match. `SystemRole`
  (`super_admin`) is a separate platform axis via `@SystemRoles` +
  `SystemRolesGuard`.
- **Permission** — fine-grained capabilities (`manage_teams`,
  `assign_users_to_teams`, `manage_skills`, `share_skills`,
  `manage_knowledge_bases`, `share_knowledge_bases`) that org admins grant
  **per role, per org**. `@RequirePermission(Permission.X)` + `PermissionsGuard`
  → `HasPermissionUseCase`. **ADMIN implicitly holds every permission**;
  MANAGER/USER hold what the org's matrix grants (each must keep ≥1). Grants
  live in the per-org `role_permissions` table; new orgs are seeded and existing
  orgs backfilled to preserve pre-RBAC access. See
  [permissions/SUMMARY.md](ayunis-core-backend/src/iam/permissions/SUMMARY.md).

**Reads stay open** — only manage/share (write) endpoints are permission-gated;
per-entity visibility (ownership + shares) is enforced separately inside the use
cases, so a member without `manage_*` can still read what's shared with them.

**Frontend enforcement mirrors, never replaces, the backend.** Any authenticated
user reads their effective permissions from `GET /permissions/me`; the
[`permissions` feature](ayunis-core-frontend/src/features/permissions) exposes
`useMyPermissions()` and `<PermissionGate>` to hide controls a member can't use
(create/edit/delete/share buttons, empty-state CTAs) and to permission-filter
the admin-settings sidebar + route guard. The backend still 403s regardless.

**Adding a new permission:**

1. Add the value to the `Permission` enum
   (`permissions/domain/value-objects/permission.enum.ts`). The API returns
   grants only — labels, grouping and display order are a frontend concern
   (`roles-settings/lib/catalog.ts` + the `admin-settings-roles` locales).
2. Generate an enum-alter migration (the column is a Postgres enum) and, if the
   default should change, update `DEFAULT_ROLE_PERMISSIONS` + the backfill.
3. Gate the relevant endpoints with `@RequirePermission(Permission.X)`.
4. (Optional) hide the matching UI controls with `<PermissionGate permission="x">`.
5. Regenerate the API client so the enum reaches the frontend.

---

## Quick Navigation

- **Adding a backend feature**: Start at the relevant domain module's SUMMARY.md
- **Adding a frontend page**: See [pages/SUMMARY.md](ayunis-core-frontend/src/pages/SUMMARY.md)
- **Understanding auth**: [authentication](ayunis-core-backend/src/iam/authentication/SUMMARY.md) + [authorization](ayunis-core-backend/src/iam/authorization/SUMMARY.md) + [permissions](ayunis-core-backend/src/iam/permissions/SUMMARY.md) (RBAC — see "Authorization & RBAC" above)
- **AI execution flow**: [threads](ayunis-core-backend/src/domain/threads/SUMMARY.md) → [runs](ayunis-core-backend/src/domain/runs/SUMMARY.md) → [messages](ayunis-core-backend/src/domain/messages/SUMMARY.md)
