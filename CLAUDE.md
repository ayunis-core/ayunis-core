# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

```
ayunis-core/
├── ayunis-core-backend/         # Backend API (NestJS)
│   ├── src/                     # TypeScript source code
│   ├── test/                    # E2E tests
│   └── ...                      # Node.js project files
├── ayunis-core-frontend/        # Frontend application
├── ayunis-core-e2e-ui-tests/    # E2E Testing with Cypress
├── ayunis-core-code-execution/  # Code Execution micro service for LLMs
├── docker-compose.yml           # Shared infrastructure (databases)
├── README.md                    # Main project documentation
└── CLAUDE.md                    # This file
```

## Project Overview

Ayunis Core is an open-source AI gateway for public administrations that enables intelligent conversations with customizable agents, advanced prompt management, and extensible tool integration.

### Key Features

- **Multiple LLM Providers**: Seamlessly connect to Ollama, Mistral, Anthropic, or OpenAI
- **Agent Builder**: Create personalized AI assistants with custom tool assignments
- **Prompt Library**: Organize and reuse prompts across conversations
- **RAG Pipeline**: Enhance model context with custom data and documents
- **Tool Integration**: Extensible tool system with JSON schema validation
- **Multi-tenancy**: Organization-based access control and user management

### Technical Stack

**Backend:**

- **Node.js 18+** with npm for dependency management
- **NestJS** for the web framework
- **TypeORM** for database interactions (PostgreSQL)
- **Bcrypt** for password hashing
- **JWT** for authentication tokens
- **Passport** for authentication strategies
- **Class-validator** and **Class-transformer** for DTO validation

**Frontend:**

- **React 19** with TypeScript
- **Vite** for build tooling
- **TanStack Router** for type-safe routing
- **TanStack Query** for server state management
- **Orval** for auto-generating TypeScript API client from OpenAPI
- **Tailwind CSS v4** with shadcn/ui components
- **i18next** for internationalization (German/English)

## Backend Development

**IMPORTANT**: All backend commands must be run from within the `ayunis-core-backend/` directory. This ensures TypeScript path aliases work correctly.

```bash
cd ayunis-core-backend
```

### Running the Backend with Database and Code Execution

```bash
npm run docker:dev
```

### Installing Dependencies

```bash
npm install
```

### Building for Production

```bash
npm run build
```

### Linting and Code Quality

```bash
npm run lint
```

To automatically fix auto-fixable issues:

```bash
npm run lint
```

### Code Formatting with Prettier

```bash
npm run format
```

### Type Checking with TypeScript

```bash
npx tsc --noEmit
```

**Type Safety Requirements:**

- Source code (`src/`) must have 0 type errors
- Avoid `any` type - use `unknown` or specific types
- Use proper type annotations for all parameters and return types
- Use class-validator decorators for DTO validation

**Before committing:**

1. Run `npx tsc --noEmit` - must show 0 errors
2. Run `npm run lint` - must pass
3. Run `npm run test` - all tests must pass

### Backend Architecture - Hexagonal Architecture Structure

The backend codebase follows hexagonal architecture with clear separation of concerns.

**Note**: All paths below are relative to the `ayunis-core-backend/` directory. TypeScript path aliases are configured in `tsconfig.json` to allow imports from `src/`.

```
src/
├── domain/              # Business entities and logic
│   └── [module-name]/
│       ├── application/ # Use cases and application services
│       │   ├── use-cases/   # Business operations
│       │   └── ports/       # Interfaces (abstract classes)
│       ├── domain/          # Core entities and business logic
│       ├── infrastructure/  # External adapters (DB, APIs)
│       ├── presenters/      # Entry points (HTTP controllers)
│       │   └── http/
│       └── [module].module.ts  # NestJS module configuration
├── iam/                 # Identity and Access Management
├── common/              # Shared utilities
├── config/              # Configuration modules
├── db/                  # Database configuration and migrations
└── main.ts              # Application entry point
```

### Module Organization

The backend application is organized into bounded contexts at the top level of `src/`:

```
src/
├── common/         # Shared utilities and cross-cutting concerns
├── iam/            # Identity and Access Management bounded context
├── domain/         # Core business domain bounded context
├── config/         # Configuration modules
├── admin/          # Admin-specific functionality
└── app/            # Application setup and initialization
```

Each domain module follows the hexagonal architecture pattern with these layers:

```
[module-name]/
├── domain/              # Business entities and core domain logic
│   └── *.entity.ts     # Domain entities (pure business models)
├── application/         # Application layer (use cases and interfaces)
│   ├── use-cases/      # Business operations and workflows
│   ├── ports/          # Interfaces (abstract classes)
│   └── dtos/           # Data Transfer Objects
├── infrastructure/      # External adapters and implementations
│   └── persistence/    # Database persistence implementations
│       └── postgres/   # PostgreSQL-specific implementation
│           ├── schema/         # Database records (TypeORM entities)
│           ├── mappers/        # Map between domain entities and records
│           └── *.repository.ts # Concrete repository implementations
├── presenters/          # Entry points and controllers
│   └── http/           # HTTP controllers (NestJS controllers)
└── [module].module.ts  # NestJS module configuration
```

**Layer Responsibilities:**

- **domain/**: Pure TypeScript classes with business logic, no TypeORM decorators
- **application/**: Business logic orchestration
  - **use-cases/**: Business workflows coordinating domain entities
  - **ports/**: Interfaces (abstract classes) for infrastructure
  - **dtos/**: Request/response shapes with validation decorators
- **infrastructure/**: External system implementations
  - **persistence/**: Database implementations organized by technology
    - **postgres/**: PostgreSQL implementation (current)
      - **schema/**: TypeORM records (extend `BaseRecord`)
      - **mappers/**: Convert between domain entities and records
      - **repositories/**: Implement repository ports
    - **in-memory/**: In-memory implementation (future)
  - External API clients, file system adapters, AI providers
- **presenters/**: HTTP controllers (NestJS), depend on use cases

**Current Modules:**

**IAM (Identity and Access Management):**

- **authentication/** - Login, JWT tokens, registration, email verification
- **authorization/** - Role-based access control
- **users/** - User management and repository
- **orgs/** - Organization management
- **subscriptions/** - Subscription and billing
- **invites/** - User invitation system
- **legal-acceptances/** - Terms of service acceptance tracking

**Domain (Core Business Logic):**

- **models/** - Multi-provider AI model management (language & embedding models)
- **threads/** - Conversation session management
- **messages/** - Message storage and retrieval
- **runs/** - AI execution tracking and management
- **agents/** - AI agent configuration and tool assignments
- **tools/** - Extensible tool system with JSON schema validation
- **prompts/** - Prompt library management
- **sources/** - External data source management (files, URLs)
- **rag/** - RAG pipeline (embeddings, chunking, indexing)
- **retrievers/** - Semantic search and retrieval
- **storage/** - File storage abstraction (MinIO integration)
- **mcp/** - Model Context Protocol integration

### Key Architectural Patterns

**Dependency Injection via NestJS:**

- Use cases receive dependencies through NestJS's constructor injection
- Repository ports define interfaces; concrete implementations are injected
- Example: `ThreadsRepositoryPort` is the interface, `ThreadsRepository` is the implementation
- Providers are registered in the module's `providers` array:

  ```typescript
  import { ThreadsRepositoryPort } from "./application/ports/threads.repository.port";
  import { ThreadsRepository } from "./infrastructure/threads.repository";

  @Module({
    providers: [
      {
        provide: ThreadsRepositoryPort,
        useClass: ThreadsRepository,
      },
      CreateThreadUseCase,
    ],
  })
  export class ThreadsModule {}
  ```

**Port/Adapter Pattern:**

- Ports are abstract classes in `application/ports/`
- Adapters are concrete implementations in `infrastructure/`
- Providers are registered in NestJS modules using the `provide`/`useClass` pattern
- This prevents cyclic imports and maintains clean architecture

**Entity Definitions and Mapping:**

**Domain Entities** (`domain/*.entity.ts`):

- Pure TypeScript classes with business logic
- No TypeORM decorators
- Generate their own UUIDs in constructor

**Database Records** (`infrastructure/persistence/postgres/schema/*.record.ts`):

- TypeORM entities extending `BaseRecord`
- Decorated with `@Entity()`, `@Column()`, `@ManyToOne()`, etc.
- IDs come from domain entities, not database

**Mappers** (`infrastructure/persistence/postgres/mappers/*.mapper.ts`):

- Convert between domain entities and database records
- Methods: `toDomain(record)` and `toRecord(entity)`

**Base Record Pattern:**

All database records extend a common `BaseRecord` that handles standard fields:

```typescript
// common/infrastructure/base.record.ts
import { PrimaryColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";

export abstract class BaseRecord {
  @PrimaryColumn("uuid")
  id: string; // NOT auto-generated - comes from domain entity

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
```

**Persistence Layer Structure:**

Persistence implementations are organized by technology:

```
infrastructure/
└── persistence/
    ├── postgres/              # PostgreSQL implementation
    │   ├── schema/
    │   ├── mappers/
    │   └── threads.repository.ts
    └── in-memory/            # Future: testing implementation
        └── threads.repository.ts
```

**Example Structure:**

```typescript
// domain/thread.entity.ts (Domain Entity - Pure TypeScript)
import { randomUUID } from "crypto";

export class Thread {
  public readonly id: string;
  public title: string;
  public readonly userId: string;
  public readonly createdAt: Date;

  constructor(
    id: string | null, // null means create new ID
    title: string,
    userId: string,
    createdAt?: Date,
  ) {
    this.id = id ?? randomUUID(); // ID generated HERE in domain layer
    this.title = title;
    this.userId = userId;
    this.createdAt = createdAt ?? new Date();
  }

  updateTitle(newTitle: string): void {
    // Business logic here
    this.title = newTitle;
  }
}

// infrastructure/persistence/postgres/schema/thread.record.ts
import { Entity, Column } from "typeorm";
import { BaseRecord } from "src/common/infrastructure/persistence/postgres/base.record";

@Entity("threads")
export class ThreadRecord extends BaseRecord {
  @Column()
  title: string;

  @Column({ name: "user_id" })
  userId: string;
}

// infrastructure/persistence/postgres/mappers/thread.mapper.ts
export class ThreadMapper {
  static toDomain(record: ThreadRecord): Thread {
    return new Thread(record.id, record.title, record.userId, record.createdAt);
  }

  static toRecord(entity: Thread): ThreadRecord {
    const record = new ThreadRecord();
    record.id = entity.id;
    record.title = entity.title;
    record.userId = entity.userId;
    record.createdAt = entity.createdAt;
    return record;
  }
}

// infrastructure/persistence/postgres/threads.repository.ts
@Injectable()
export class ThreadsPostgresRepository implements ThreadsRepositoryPort {
  constructor(
    @InjectRepository(ThreadRecord)
    private readonly repo: Repository<ThreadRecord>,
  ) {}

  async findById(id: string): Promise<Thread | null> {
    const record = await this.repo.findOne({ where: { id } });
    return record ? ThreadMapper.toDomain(record) : null;
  }

  async save(thread: Thread): Promise<Thread> {
    const record = ThreadMapper.toRecord(thread);
    const saved = await this.repo.save(record);
    return ThreadMapper.toDomain(saved);
  }
}

// threads.module.ts (NestJS Module Configuration)
@Module({
  imports: [TypeOrmModule.forFeature([ThreadRecord])],
  providers: [
    {
      provide: ThreadsRepositoryPort,
      useClass: ThreadsPostgresRepository, // Easy to swap with ThreadsInMemoryRepository
    },
    CreateThreadUseCase,
  ],
})
export class ThreadsModule {}
```

**Entity ID Standards:**

IDs are UUIDs generated in domain entities, not by the database:

- Domain entities: Accept `id: string | null`, generate with `randomUUID()` if null
- Database records: Use `@PrimaryColumn('uuid')` (NOT `@PrimaryGeneratedColumn`)
- Repository methods: Accept/return domain entities (not records)

**Use Case Pattern:**

- Each business operation is a separate use case class
- Use cases are `@Injectable()` and can be injected into HTTP controllers
- Use cases depend on repository ports, not concrete implementations
- Use cases inject `ContextService` to access current user data
- Use cases throw domain errors (not NestJS HTTP exceptions)
- Example:

  ```typescript
  @Injectable()
  export class CreateThreadUseCase {
    constructor(
      @Inject(ThreadsRepositoryPort)
      private readonly threadsRepository: ThreadsRepositoryPort,
      private readonly contextService: ContextService,
    ) {}

    async execute(command: CreateThreadCommand): Promise<Thread> {
      // Get current user from context (set by authentication middleware)
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Business logic here
      const thread = new Thread(null, command.title, userId);
      return await this.threadsRepository.save(thread);
    }
  }
  ```

**ContextService Pattern (Current User Access):**

The application uses `ContextService` (from `nestjs-cls`) to provide request-scoped context for current user data:

- **DO NOT** pass `userId` or `orgId` through commands/queries
- **DO NOT** extract user data in controllers and pass to use cases
- **DO** inject `ContextService` in use cases and get user data at runtime
- **DO** check if user is authenticated at the start of each use case

```typescript
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class SomeUseCase {
  constructor(
    private readonly contextService: ContextService,
    // ... other dependencies
  ) {}

  async execute(command: SomeCommand): Promise<SomeResult> {
    // Get current user from context
    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Use userId/orgId for authorization and business logic
    // ...
  }
}
```

**Commands and Queries:**

- Commands and queries contain ONLY operation-specific data
- NO `userId`, `orgId`, or other context data in commands
- Use cases retrieve context data from `ContextService`

```typescript
// CORRECT ✓
export class AssignToolToAgentCommand {
  constructor(
    public readonly agentId: string,
    public readonly toolId: string,
  ) {}
}

// INCORRECT ✗
export class AssignToolToAgentCommand {
  constructor(
    public readonly agentId: string,
    public readonly toolId: string,
    public readonly userId: string,  // ✗ Don't include user context
    public readonly orgId: string,   // ✗ Don't include user context
  ) {}
}
```

**Domain Error Pattern:**

Each module defines domain-specific errors that extend `ApplicationError`:

- **DO** throw domain errors in use cases (e.g., `AgentNotFoundError`)
- **DO NOT** throw NestJS HTTP exceptions in use cases (e.g., `NotFoundException`)
- Domain errors are converted to HTTP responses by global exception filter
- All domain errors have a `toHttpException()` method

**Error File Structure:**

```typescript
// application/[module].errors.ts
import { ApplicationError, ErrorMetadata } from 'src/common/errors/base.error';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

export enum AgentErrorCode {
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  AGENT_INVALID_INPUT = 'AGENT_INVALID_INPUT',
  // ... other codes
}

export abstract class AgentError extends ApplicationError {
  constructor(
    message: string,
    code: AgentErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }

  toHttpException() {
    switch (this.statusCode) {
      case 404:
        return new NotFoundException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
      case 409:
        return new ConflictException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
      default:
        return new BadRequestException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
    }
  }
}

export class AgentNotFoundError extends AgentError {
  constructor(agentId: string, metadata?: ErrorMetadata) {
    super(
      `Agent with ID ${agentId} not found`,
      AgentErrorCode.AGENT_NOT_FOUND,
      404,
      metadata,
    );
  }
}
```

**Use Case Error Handling Pattern:**

```typescript
@Injectable()
export class SomeUseCase {
  private readonly logger = new Logger(SomeUseCase.name);

  constructor(
    private readonly someRepository: SomeRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: SomeCommand): Promise<SomeResult> {
    this.logger.log('executingSomeOperation', { id: command.id });

    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Business logic that may throw domain errors
      const entity = await this.someRepository.findById(command.id);
      if (!entity) {
        throw new SomeNotFoundError(command.id); // Domain error
      }

      // ... more business logic

      return result;
    } catch (error) {
      // Re-throw application errors and auth errors
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      // Log and wrap unexpected errors
      this.logger.error('Unexpected error in use case', { error: error as Error });
      throw new UnexpectedSomeError('Unexpected error occurred', {
        error: error as Error,
      });
    }
  }
}
```

**Controller Pattern:**

Controllers are thin and delegate all business logic to use cases:

- **DO NOT** extract user data with `@CurrentUser()` and pass to use cases
- **DO NOT** include authorization logic in controllers
- **DO** create commands/queries from DTOs
- **DO** call use cases and map results to response DTOs
- Let errors bubble up to global exception filter

```typescript
@Controller('agents')
export class AgentsController {
  constructor(
    private readonly createAgentUseCase: CreateAgentUseCase,
    private readonly agentDtoMapper: AgentDtoMapper,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new agent' })
  @ApiResponse({ status: 201, type: AgentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async create(
    @Body() createAgentDto: CreateAgentDto,
  ): Promise<AgentResponseDto> {
    // Note: No @CurrentUser() extraction needed
    // Use case gets user from ContextService

    const agent = await this.createAgentUseCase.execute(
      new CreateAgentCommand({
        name: createAgentDto.name,
        instructions: createAgentDto.instructions,
        modelId: createAgentDto.modelId,
      }),
    );

    return this.agentDtoMapper.toDto(agent);
  }
}
```

**Authorization Pattern:**

Ayunis has three levels of authorization, each with different implementation patterns:

**1. Super Admin Routes** (Platform Administration):
- Used for platform-wide management (e.g., managing all models across all organizations)
- Routes typically under `/api/admin/*`
- Apply at **class level** with three decorators:
  ```typescript
  @Controller('admin')
  @UseGuards(AdminGuard)
  @Public() // Bypass JWT guard
  @Admin()  // Require admin token
  export class AdminController {
    // All methods in this controller require super admin access
  }
  ```
- Authentication via `X-Admin-Token` header (not JWT)
- Example: `src/admin/presenters/http/admin.controller.ts`

**2. Organization Admin Routes** (Organization-Level Management):
- Used for org-level configuration (e.g., managing MCP integrations, permitted models)
- Routes can be anywhere (e.g., `/api/mcp-integrations/*`, `/api/models/*`)
- Apply at **method level** with `@Roles()` decorator:
  ```typescript
  @Controller('mcp-integrations')
  export class McpIntegrationsController {
    @Post('predefined')
    @Roles(UserRole.ADMIN) // Organization admin only
    async createPredefined(@Body() dto: CreateDto): Promise<ResponseDto> {
      // Use case gets orgId from ContextService
      // Only org admins can create integrations for their org
    }
  }
  ```
- Requires JWT authentication + user must have `ADMIN` role in their organization
- Use cases retrieve `orgId` from `ContextService` to enforce org boundaries
- Example: `src/domain/models/presenters/http/models.controller.ts` (lines 109, 147, 175, etc.)

**3. User-Level Routes** (User-Scoped Resources):
- Used for user's own resources (e.g., their agents, threads, prompts)
- No authorization decorator needed
- Authorization enforced at **repository level** via `userId` scoping:
  ```typescript
  @Controller('agents')
  export class AgentsController {
    @Get(':id')
    async getAgent(@Param('id') agentId: UUID): Promise<AgentResponseDto> {
      // No @Roles() decorator
      // Use case gets userId from ContextService
      // Repository enforces: agentRepository.findOne(agentId, userId)
      // Users can only access agents they own
    }
  }
  ```
- Requires JWT authentication (enforced globally)
- Use cases retrieve `userId` from `ContextService`
- Repositories filter by `userId` to prevent unauthorized access
- Example: Most endpoints in `src/domain/agents/presenters/http/agents.controller.ts`

**Authorization Implementation Checklist:**

When implementing a new controller endpoint:

1. **Determine Authorization Level**:
   - Super admin? → Class-level `@UseGuards(AdminGuard)`, `@Public()`, `@Admin()`
   - Organization admin? → Method-level `@Roles(UserRole.ADMIN)`
   - User-scoped? → No decorator, repository-level filtering

2. **Import Required Decorators** (if needed):
   ```typescript
   import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
   import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
   ```

3. **Use Case Retrieves Context**:
   - DO NOT pass `userId` or `orgId` through commands
   - Use cases inject `ContextService` and call `contextService.get('userId')` / `contextService.get('orgId')`

4. **Document in OpenAPI**:
   - Add appropriate `@ApiResponse` for `401 Unauthorized` and `403 Forbidden`

**DTO Pattern:**

- DTOs are classes with class-validator decorators
- Use `@ApiProperty()` from `@nestjs/swagger` for OpenAPI documentation
- DTOs are validated automatically by NestJS validation pipe
- Example:

  ```typescript
  import { ApiProperty } from "@nestjs/swagger";
  import { IsString, IsNotEmpty } from "class-validator";

  export class CreateThreadDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    title: string;
  }
  ```

**Module Boundaries:**

- Modules under `src/iam/` and `src/domain/` are bounded contexts
- Avoid deep imports across module boundaries
- Controllers use use cases from their module
- Cross-module dependencies via repository ports or use cases
- Shared infrastructure (`src/common/`, `src/config/`) can be imported directly

### Code Quality Standards

**Validation:**

- All DTOs use class-validator decorators (`@IsString()`, `@IsUUID()`, etc.)
- Automatic validation via NestJS validation pipe

**Linting:**

- ESLint warns on unused imports/variables
- Avoid `any` type

### Avoiding Cyclic Imports

Use `forwardRef()` for circular module dependencies:

```typescript
@Module({
  imports: [forwardRef(() => OtherModule)],
})
export class MyModule {}
```

Or redesign module boundaries and use events for loose coupling.

### Database Configuration

Database connection is configured via environment variable in `.env`:

```bash
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=ayunis
```

TypeORM is configured in `src/db/datasource.ts`.

### Database Migrations

**Generate a new migration:**

```bash
npm run migration:generate:dev "MigrationName"
```

**Run pending migrations:**

```bash
npm run migration:run:dev
```

**Revert last migration:**

```bash
npm run migration:revert:dev
```

**Show migration status:**

```bash
npm run migration:show:dev
```

**IMPORTANT**: Always generate migrations for schema changes. Never modify the database schema directly.

## Frontend Development

**IMPORTANT**: All frontend commands must be run from within the `ayunis-core-frontend/` directory. The frontend follows a **Feature-Sliced Design (FSD)** inspired architecture.

```bash
cd ayunis-core-frontend
```

### Running the Frontend

```bash
npm run dev
```

Development server runs on port 3001.

### Installing Dependencies

```bash
npm install
```

### Building for Production

```bash
npm run build
```

Before committing: build must succeed, test manually in browser.

### API Client Generation with Orval

Frontend uses Orval to generate TypeScript client from backend OpenAPI schema.

**Generate API Client:**

```bash
npm run openapi:update  # Fetch schema and generate client
```

After backend endpoint changes:

1. Ensure backend is running
2. Run `npm run openapi:update` in frontend
3. Generated code in `src/shared/api/generated/` (DO NOT edit manually)

**Usage:**

```tsx
import { useCreateThread } from "@/shared/api/generated/threads";

const createThreadMutation = useCreateThread({
  mutation: {
    onSuccess: (data) => {
      /* handle success */
    },
  },
});
```

### Frontend Architecture - Feature-Sliced Design (FSD) Inspired

Frontend follows Feature-Sliced Design with clear layer dependencies:

```
src/
├── app/         # Application initialization, providers, routers
├── pages/       # Route-level components
├── widgets/     # Reusable composite UI components
├── features/    # Business logic + feature-specific UI
├── shared/      # Primitives (ui, api, lib, config)
└── layouts/     # Layout components
```

**Architecture Rules:**

- **pages**: Compose widgets/features, minimal logic
- **widgets**: Reusable UI components (≥2 pages)
- **features**: Self-contained business logic + UI
- **shared**: Primitives from shadcn/ui, no business logic

**Import Rules:**

- pages → widgets, features, shared
- widgets → features, shared
- features → shared only
- Export via `index.ts` (no deep imports across boundaries)

**Adding Components:**

- New page: `src/pages/[page-name]/ui/`
- Reusable widget (≥2 pages): `src/widgets/`
- Business logic: `src/features/[feature-name]/`
- Primitive: `npx shadcn@latest add [component-name]`

### Internationalization (i18n)

Application supports German and English via i18next:

```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
return <h1>{t('welcome.title')}</h1>;
```

Translation files in `src/locales/`.

## Multi-Provider AI Integration

Supports OpenAI, Anthropic, Mistral, Ollama, Synaforce.

- Model registry in `src/domain/models/`
- Provider adapters in `src/common/clients/` or `src/domain/models/infrastructure/inference/`
- Organization-level permissions and streaming support

**Add Model via Admin API:**

```bash
curl -X POST http://localhost:3000/api/admin/language-models \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: YOUR_TOKEN" \
  -d '{"name": "gpt-4", "provider": "openai", "displayName": "GPT-4", "canStream": true, "canUseTools": true}'
```

## RAG Pipeline

Document processing in `src/domain/rag/`:

- **Embeddings**: Multi-provider text vectorization
- **Indexing**: Parent-child chunking, configurable sizes
- **Retrieval**: Vector similarity search (pgvector)
- **Sources**: File upload, URL scraping (Cheerio)

## Tool System

Extensible tools with JSON schema validation in `src/domain/tools/`:

- Dynamic assignment to agents
- Sandboxed execution

## Agent System

Configurable AI assistants in `src/domain/agents/`:

- Assign tools and RAG sources
- Custom system prompts

## Development Environment

**Prerequisites:** Node.js 18+, npm, Docker/Docker Compose, PostgreSQL

**Setup:**

```bash
# Copy env files
cp ./.env.example ./.env
cp ./ayunis-core-backend/.env.example ./ayunis-core-backend/.env
cp ./ayunis-core-frontend/.env.example ./ayunis-core-frontend/.env

# Configure ayunis-core-backend/.env:
# - Database, JWT secrets, AI provider keys, SMTP, MinIO

# Start with Docker
docker compose up -d

# Run migrations
cd ayunis-core-backend && npm run migration:run:dev
```

**Access:**

- Frontend: http://localhost:3001
- Backend: http://localhost:3000/api
- Swagger: http://localhost:3000/api/docs

### Common Development Tasks

**Add Domain Module:**

1. Create `src/domain/[module]/` with subdirs: `domain/`, `application/`, `infrastructure/persistence/postgres/`, `presenters/http/`
2. Define entities, use cases, ports, repositories, controllers
3. Create `[module].module.ts`, register providers, import in `app.module.ts`

**Add API Endpoint:**

1. Create DTO, use case, controller method with Swagger decorators
2. Regenerate frontend client: `cd ayunis-core-frontend && npm run openapi:update`

**Add Frontend Page:**

1. Create `src/pages/[page-name]/ui/`
2. Compose with existing widgets/features

## Testing

**Backend (Jest):**

```bash
npm run test        # Unit tests
npm run test:cov    # With coverage
npm run test:e2e    # E2E tests
```

**Frontend (Vitest):**

```bash
npm run test
```

## Troubleshooting

**Backend won't start:** Check database connection, run migrations, verify env variables

**Frontend API client out of sync:** Run `npm run openapi:update` (backend must be running)

**Type errors:** Run `npm install`, clear cache: `rm -rf node_modules/.cache`

**Migration issues:** Check status with `npm run migration:show:dev`, never modify after running

See `README.md`, `DEPLOYMENT.md`, NestJS/Orval docs for more help.
