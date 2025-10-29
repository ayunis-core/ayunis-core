# Ayunis Core Development Guidelines

## Project Overview

Ayunis Core is an open-source AI gateway built with a multi-service architecture following Domain-Driven Design (DDD) and hexagonal architecture principles. The system provides intelligent conversations, agent management, and extensible tool integration for public administrations.

## Root Level Organization

```
ayunis-core/
├── ayunis-core-backend/     # NestJS backend application
├── ayunis-core-frontend/    # React frontend application
├── ayunis-core-code-execution/  # Python code execution service
├── ayunis-core-e2e-ui-tests/    # Cypress end-to-end tests
├── docker-compose.yml       # Production Docker setup
├── docker-compose.test.yml  # Testing Docker setup
└── _docs/                   # Project documentation
```

## Backend Architecture (Hexagonal/Clean Architecture)

The backend follows hexagonal architecture with clear separation of concerns and Domain-Driven Design principles:

```
src/
├── domain/                  # Business domains (core business logic)
│   ├── <domain>/           # Individual domain module (e.g., models, agents, threads)
│   │   ├── domain/         # Business logic & entities
│   │   │   ├── *.entity.ts # Domain entities (business objects)
│   │   │   └── value-objects/ # Value objects and enums
│   │   ├── application/    # Use cases, commands, queries (application layer)
│   │   │   ├── ports/      # Interfaces for adapters (dependency inversion)
│   │   │   ├── commands/   # Command handlers (CQRS write operations)
│   │   │   ├── queries/    # Query handlers (CQRS read operations)
│   │   │   ├── use-cases/  # Application use cases
│   │   │   └── *.errors.ts # Domain-specific error definitions
│   │   ├── infrastructure/ # External adapters (infrastructure layer)
│   │   │   ├── handlers/   # Business logic handlers
│   │   │   └── persistence/ # Database repositories, mappers, records
│   │   └── presenters/     # Controllers & DTOs (presentation layer)
│   │       └── http/       # HTTP controllers and DTOs
│   │           └── dtos/   # Data Transfer Objects
├── iam/                    # Identity & Access Management (cross-cutting concern)
│   ├── authentication/     # Auth logic
│   ├── authorization/      # Permission logic
│   ├── users/             # User management
│   ├── orgs/              # Organization management
│   └── subscriptions/     # Billing & subscriptions
├── common/                 # Shared utilities and cross-cutting concerns
│   ├── clients/           # External service clients
│   ├── db/                # Database utilities and base classes
│   ├── errors/            # Base error classes and error handling
│   ├── filters/           # Exception filters (NestJS)
│   ├── guards/            # Route guards (NestJS)
│   ├── middleware/        # HTTP middleware
│   └── util/              # Helper functions and utilities
├── config/                # Configuration modules
├── db/                    # Database migrations and data source
│   └── migrations/        # TypeORM migrations (timestamp-named)
└── main.ts               # Application entry point
```

### Key Domain Modules

- **agents**: AI agent management and execution
- **messages**: Chat message handling and processing
- **models**: LLM and embedding model management
- **prompts**: Prompt library and management
- **runs**: Execution run tracking and management
- **sources**: Document and data source management
- **storage**: File storage operations
- **threads**: Conversation thread management
- **tools**: Tool integration and execution
- **usage**: Usage tracking and analytics

## Frontend Architecture (Feature-Sliced Design)

The frontend follows Feature-Sliced Design methodology with clear layer separation:

```
src/
├── app/                    # Application configuration and setup
│   └── routes/            # File-based routing (TanStack Router)
├── pages/                 # Page components (business logic containers)
│   ├── auth/             # Authentication pages
│   ├── chat/             # Chat interface pages
│   ├── agents/           # Agent management pages
│   ├── prompts/          # Prompt library pages
│   └── settings/         # User/admin settings pages
│       └── <feature>/    # Feature-specific page structure:
│           ├── api/      # API integration hooks
│           ├── model/    # State management and types
│           ├── ui/       # UI components
│           │   └── components/ # Sub-components
│           └── lib/      # Feature-specific utilities
├── widgets/              # Complex reusable UI components
│   ├── app-sidebar/      # Navigation sidebar
│   ├── chat-input/       # Chat input component
│   └── markdown/         # Markdown renderer
├── features/             # Shared business logic hooks
├── entities/             # Domain entities and types
├── shared/               # Shared utilities and infrastructure
│   ├── api/              # API client & generated types
│   │   └── generated/    # Auto-generated API client (DO NOT EDIT)
│   ├── ui/               # shadcn/ui components (PREFERRED UI LIBRARY)
│   │   └── shadcn/       # shadcn/ui component implementations
│   ├── lib/              # Utility functions
│   ├── hooks/            # Custom React hooks
│   ├── contexts/         # React contexts
│   ├── config/           # Configuration
│   └── locales/          # Internationalization
└── layouts/              # Page layouts and templates
```

## Error Handling Patterns

### Backend Error Handling

**Domain-Specific Errors**: Each domain MUST define its own error classes following this pattern:

```typescript
// domain/<domain>/application/<domain>.errors.ts
export enum DomainErrorCode {
  ENTITY_NOT_FOUND = 'ENTITY_NOT_FOUND',
  INVALID_INPUT = 'INVALID_INPUT',
  // ... other domain-specific codes
}

export abstract class DomainError extends ApplicationError {
  constructor(message: string, code: DomainErrorCode, statusCode: number = 400, metadata?: ErrorMetadata) {
    super(message, code, statusCode, metadata);
  }

  toHttpException() {
    // Convert to appropriate NestJS HTTP exception
    switch (this.statusCode) {
      case 404: return new NotFoundException({...});
      case 409: return new ConflictException({...});
      default: return new BadRequestException({...});
    }
  }
}

export class SpecificDomainError extends DomainError {
  constructor(entityId: UUID, metadata?: ErrorMetadata) {
    super(`Entity '${entityId}' not found`, DomainErrorCode.ENTITY_NOT_FOUND, 404, metadata);
  }
}
```

**Error Handling Rules**:

- All domain errors MUST extend `ApplicationError` from `src/common/errors/base.error.ts`
- Each domain MUST define its own error codes enum
- Error classes MUST include proper HTTP status codes
- Use `toHttpException()` method for NestJS integration
- Include metadata for debugging and context
- The global `ApplicationErrorFilter` automatically handles domain errors

### Frontend Error Handling

**API Error Handling**: Use the generated client's built-in error handling:

```typescript
// Use generated hooks with proper error handling
const { data, isLoading, isError, error } = useGeneratedHook(params, {
  query: {
    onError: (error) => {
      // Handle specific error cases
      if (error.response?.status === 403) {
        showError(t("errors.forbidden"));
      }
    },
  },
});
```

## UI Component Guidelines

### shadcn/ui Component Library

**CRITICAL**: Always prefer shadcn/ui components over custom UI implementations

**Why shadcn/ui**:

- Built on Radix UI primitives for accessibility and behavior
- Consistent design system with Tailwind CSS
- Copy-paste components that you own and can customize
- TypeScript-first with excellent type safety
- Maintained and battle-tested component library

**Usage Rules**:

- **ALWAYS use shadcn/ui components** when available (Button, Input, Card, Dialog, Table, etc.)
- **NEVER create custom UI components** that duplicate existing shadcn/ui functionality
- **Extend shadcn/ui components** using composition and Tailwind classes for customization
- **Add new shadcn/ui components** using `npx shadcn@latest add <component>` when needed

**Component Categories**:

**Layout & Structure**:

```typescript
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/shadcn/card";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
```

**Forms & Inputs**:

```typescript
import { Button } from "@/shared/ui/shadcn/button";
import { Input } from "@/shared/ui/shadcn/input";
import { Label } from "@/shared/ui/shadcn/label";
import { Checkbox } from "@/shared/ui/shadcn/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/shadcn/select";
```

**Navigation & Menus**:

```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/shadcn/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui/shadcn/tabs";
```

**Feedback & Overlays**:

```typescript
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/shadcn/alert";
import { Badge } from "@/shared/ui/shadcn/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/shadcn/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/shadcn/tooltip";
```

**Data Display**:

```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/shadcn/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/shadcn/avatar";
```

**Custom Component Guidelines**:

- Only create custom components for **business-specific functionality** (e.g., `ChatMessage`, `AgentCard`, `UsageChart`)
- Custom components should **compose shadcn/ui primitives**, not replace them
- Use Tailwind CSS for styling, following shadcn/ui design tokens
- Maintain consistency with the shadcn/ui design system

**Example of Proper Custom Component**:

```typescript
// ✅ CORRECT: Custom component using shadcn/ui primitives
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/shadcn/card";
import { Button } from "@/shared/ui/shadcn/button";
import { Badge } from "@/shared/ui/shadcn/badge";

export function AgentCard({ agent, onEdit, onDelete }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {agent.name}
          <Badge variant="secondary">{agent.status}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{agent.description}</p>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ❌ INCORRECT: Custom button component duplicating shadcn/ui
export function CustomButton({ children, onClick }) {
  return (
    <button
      className="px-4 py-2 bg-blue-500 text-white rounded"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

**Adding New shadcn/ui Components**:

```bash
# Add a new component to the project
npx shadcn@latest add <component-name>

# Examples:
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add table
```

## API Client Guidelines

### Frontend API Integration

**CRITICAL**: ALWAYS use auto-generated client code from OpenAPI spec located at `@/shared/api/generated/ayunisCoreAPI`

**Rules**:

- **NEVER write manual API calls** using axios, fetch, or other HTTP clients directly
- The generated client provides type-safe API calls and automatic TypeScript types
- Generated hooks follow the pattern: `use[Controller][Method]` (e.g., `useAdminUsageControllerGetUsageStats`)
- All API types are available from `@/shared/api/generated/ayunisCoreAPI.schemas`

**Correct Usage Pattern**:

```typescript
// ✅ CORRECT: Use generated hooks
import { useAdminUsageControllerGetUsageStats } from "@/shared/api/generated/ayunisCoreAPI";
import type { UsageStatsDto } from "@/shared/api/generated/ayunisCoreAPI.schemas";

export function useUsageStats(params = {}) {
  return useAdminUsageControllerGetUsageStats(params, {
    query: { staleTime: 5 * 60 * 1000 },
  });
}

// ❌ INCORRECT: Manual API calls
import { axiosInstance } from "@/shared/api";
const response = await axiosInstance.get("/admin/usage/stats");
```

### Code Generation Workflow

1. Backend changes to controllers/DTOs automatically update OpenAPI spec
2. Frontend regenerates client using `npm run openapi:update`
3. Use the generated hooks and types in frontend components
4. Wrap generated hooks in custom hooks for additional logic if needed

### Temporary Fallbacks

When new backend endpoints are not yet available in the generated client:

- Add TODO comments indicating the expected generated hook/type names
- Implement temporary fallback logic with proper error handling
- Use `retry: false` in query options to avoid console spam
- Provide sensible default values for the expected data structure

## Database Patterns

### Migrations

- **Naming**: Use timestamp prefix: `YYYYMMDDHHMMSS-DescriptiveName.ts`
- **Content**: Descriptive names explaining the change (e.g., `AddSubscriptions`, `MakeThreadModelOptional`)
- **Location**: `src/db/migrations/`
- **Generation**: Use `npm run migration:generate:dev -- migrations/MigrationName`

### Repository Pattern

- **Interface**: Define abstract repository in `domain/<domain>/application/ports/`
- **Implementation**: Concrete repository in `domain/<domain>/infrastructure/persistence/`
- **Naming**: `<Entity>Repository` (interface), `Local<Entity>Repository` (implementation)
- **Injection**: Use string tokens for dependency injection: `@Inject('EntityRepository')`

### Entity Patterns

- **Location**: `domain/<domain>/domain/<entity>.entity.ts`
- **Structure**: Abstract base classes with readonly properties
- **IDs**: Use `UUID` from `crypto` module
- **Timestamps**: Include `createdAt` and `updatedAt` as `Date` objects
- **Immutability**: Entities should be immutable after creation

## CQRS Patterns

### Commands (Write Operations)

```typescript
// domain/<domain>/application/commands/<action>.command.ts
export class CreateEntityCommand {
  constructor(public readonly name: string, public readonly orgId: UUID) {}
}

// Command handler
@Injectable()
export class CreateEntityHandler {
  execute(command: CreateEntityCommand): Promise<Entity> {
    // Implementation
  }
}
```

### Queries (Read Operations)

```typescript
// domain/<domain>/application/queries/<action>.query.ts
export class GetEntitiesQuery {
  constructor(public readonly orgId: UUID) {}
}

// Query handler (Use Case)
@Injectable()
export class GetEntitiesUseCase {
  execute(query: GetEntitiesQuery): Promise<Entity[]> {
    // Implementation
  }
}
```

## Naming Conventions

### Backend

- **Modules**: PascalCase with suffix (e.g., `ThreadsModule`)
- **Services/Use Cases**: PascalCase with suffix (e.g., `ThreadsService`, `GetThreadsUseCase`)
- **Controllers**: PascalCase with suffix (e.g., `ThreadsController`)
- **Entities**: PascalCase (e.g., `Thread`)
- **DTOs**: PascalCase with suffix (e.g., `CreateThreadDto`)
- **Errors**: PascalCase with suffix (e.g., `ThreadNotFoundError`)
- **Enums**: PascalCase (e.g., `ModelProvider`)
- **Files**: kebab-case (e.g., `threads.service.ts`, `thread-not-found.error.ts`)
- **Directories**: kebab-case (e.g., `thread-management/`)

### Frontend

- **Components**: PascalCase (e.g., `ChatInput`, `AgentCard`)
- **shadcn/ui Components**: Use as-is from `@/shared/ui/shadcn/` (e.g., `Button`, `Card`, `Dialog`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAgents`)
- **Files**: kebab-case (e.g., `chat-input.tsx`)
- **Directories**: kebab-case (e.g., `chat-input/`)
- **API types**: PascalCase (e.g., `CreateThreadRequest`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `MAX_FILE_SIZE`)

**Component Creation Rules**:

- **DO NOT** create components that duplicate shadcn/ui functionality
- **DO** create business-specific components that compose shadcn/ui primitives
- **DO** use shadcn/ui components for all basic UI needs (buttons, inputs, cards, etc.)

## File Organization Patterns

### Backend Module Structure

```
domain/<domain>/
├── <domain>.module.ts           # Module definition with providers
├── domain/
│   ├── <entity>.entity.ts       # Domain entities
│   ├── <entity>.repository.ts   # Repository interfaces (ports)
│   └── value-objects/           # Value objects and enums
├── application/
│   ├── <domain>.errors.ts       # Domain-specific errors
│   ├── ports/                   # Interfaces for infrastructure
│   ├── commands/                # Command handlers
│   ├── queries/                 # Query handlers
│   └── use-cases/               # Application use cases
│       └── <action>/
│           ├── <action>.use-case.ts
│           └── <action>.query.ts
├── infrastructure/
│   ├── handlers/                # Business logic handlers
│   └── persistence/             # Database implementations
│       └── local-<entity>/
│           ├── local-<entity>.repository.ts
│           ├── mappers/         # Entity-Record mappers
│           └── schema/          # TypeORM records
└── presenters/
    └── http/
        ├── <domain>.controller.ts
        └── dtos/                # Data Transfer Objects
            ├── create-<entity>.dto.ts
            └── <entity>-response.dto.ts
```

### Frontend Feature Structure

```
pages/<feature>/
├── index.ts                    # Public exports
├── api/                        # API integration layer
│   ├── use<Entity><Action>.ts  # Custom API hooks
│   └── index.ts               # API exports
├── model/                      # State management and types
│   ├── types.ts               # Feature-specific types
│   └── index.ts               # Model exports
├── ui/                         # UI components
│   ├── <Feature>Page.tsx      # Main page component
│   └── components/            # Sub-components
│       ├── <Component>.tsx
│       └── index.ts
└── lib/                        # Feature utilities
    ├── utils.ts               # Helper functions
    └── constants.ts           # Feature constants
```

## Import Conventions

### Backend

- **Path mapping**: Use `src/` prefix: `import { ... } from 'src/domain/threads'`
- **Barrel exports**: Use index files for clean imports
- **Relative imports**: Within same module only
- **Dependencies**: Domain → Application → Infrastructure → Presenters

### Frontend

- **Alias imports**: Use `@/` for src: `import { ... } from '@/shared/api'`
- **Generated API**: Always from generated client: `import { useHook } from "@/shared/api/generated/ayunisCoreAPI"`
- **Barrel exports**: For public APIs and component exports
- **Relative imports**: For internal feature components only

## Configuration Patterns

### Backend Configuration

- **Environment files**: `.env` with `.env.example` templates
- **Config modules**: Use `@nestjs/config` with `registerAs`
- **Validation**: Use class-validator for environment validation
- **Type safety**: Define configuration interfaces

### Frontend Configuration

- **Environment**: Use Vite's `import.meta.env`
- **Config object**: Centralized in `src/shared/config/index.ts`
- **Type safety**: Use `as const` for immutable config
- **Environment detection**: Helper functions for env checks

## Development Workflow

### Backend Development

```bash
# Start development environment
npm run start:dev

# Database operations
npm run migration:generate:dev -- migrations/MigrationName
npm run migration:run:dev
npm run migration:revert:dev

# Testing
npm run test          # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:cov      # Coverage report

# Code generation
npm run generate:client  # Generate API client from OpenAPI spec
```

### Frontend Development

```bash
# Start development server
npm run dev           # Runs on port 3001

# Build for production
npm run build

# Testing
npm run test

# API client generation
npm run openapi:update  # Fetch schema and generate client
```

### Full Stack Development

```bash
# Production environment
docker compose up -d --build

# Development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker compose logs -f app
```

## Code Quality Standards

### TypeScript Configuration

- **Strict mode**: Enabled with decorators support
- **Path mapping**: Configured for clean imports
- **Type safety**: No `any` types, prefer strict typing

### Linting and Formatting

- **ESLint**: TypeScript and Prettier integration
- **Prettier**: Consistent code formatting
- **Import order**: Organized by type (external, internal, relative)

### Testing Standards

- **Unit tests**: Focus on business logic and use cases
- **Integration tests**: Test API endpoints and database operations
- **E2E tests**: Critical user flows with Cypress
- **Coverage**: Maintain reasonable coverage for core functionality

## Security Considerations

### Backend Security

- **Authentication**: JWT with cookie-based sessions
- **Authorization**: Role-based access control (RBAC)
- **Input validation**: Use class-validator on all DTOs
- **SQL injection**: Use TypeORM query builder, avoid raw queries
- **CORS**: Configured for specific origins

### Frontend Security

- **XSS prevention**: Sanitize user inputs, use React's built-in protections
- **CSRF protection**: Cookie-based auth with SameSite settings
- **Content Security Policy**: Configured via security headers
- **Dependency scanning**: Regular updates and vulnerability checks

## Performance Guidelines

### Backend Performance

- **Database**: Use indexes, optimize queries, implement pagination
- **Caching**: Implement caching for frequently accessed data
- **Async operations**: Use async/await, avoid blocking operations
- **Memory management**: Proper cleanup of resources and connections

### Frontend Performance

- **Code splitting**: Use dynamic imports for large components
- **Memoization**: Use React.memo, useMemo, useCallback appropriately
- **Bundle optimization**: Tree shaking, minimize bundle size
- **API optimization**: Use TanStack Query for caching and deduplication

This comprehensive guide ensures consistent development practices across the Ayunis Core project while maintaining high code quality and architectural integrity.
