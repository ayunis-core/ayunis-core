---
name: new-module
description: Scaffold a new hexagonal backend module in ayunis-core. Use when adding a new domain concept that needs its own entity, repository, use cases, and controller.
---

# New Backend Module — ayunis-core-backend

## Prerequisites

- Read the `ayunis-core-backend-dev` skill for TDD workflow and validation sequence
- Read the `ayunis-core-migrations` skill for database migration workflow
- Ensure the dev stack is running (`./dev up` from repo root)

## Working Directory

```bash
cd ayunis-core-backend
```

## Directory Structure

Every module follows hexagonal architecture. Create this structure:

```text
src/domain/<module>/
├── SUMMARY.md
├── domain/
│   ├── <entity>.entity.ts
│   └── value-objects/          # Enums, value objects (if needed)
├── application/
│   ├── ports/
│   │   └── <entities>-repository.port.ts
│   ├── use-cases/
│   │   ├── create-<entity>/
│   │   │   ├── create-<entity>.command.ts
│   │   │   ├── create-<entity>.use-case.ts
│   │   │   └── create-<entity>.use-case.spec.ts
│   │   ├── get-<entity>/
│   │   │   ├── get-<entity>.query.ts
│   │   │   ├── get-<entity>.use-case.ts
│   │   │   └── get-<entity>.use-case.spec.ts
│   │   └── delete-<entity>/
│   │       ├── delete-<entity>.command.ts
│   │       ├── delete-<entity>.use-case.ts
│   │       └── delete-<entity>.use-case.spec.ts
│   └── <module>.errors.ts
├── infrastructure/
│   └── persistence/postgres/
│       ├── schema/
│       │   └── <entity>.record.ts
│       ├── mappers/
│       │   └── <entity>.mapper.ts
│       └── postgres-<entities>.repository.ts
├── presenters/http/
│   ├── dto/
│   │   ├── create-<entity>.dto.ts
│   │   └── <entity>-response.dto.ts
│   ├── mappers/
│   │   └── <entity>-dto.mapper.ts
│   └── <entities>.controller.ts
└── <module>.module.ts
```

## File Templates

### 1. Domain Entity

IDs are generated in the domain layer using `randomUUID()`, not by the database.

```typescript
// src/domain/<module>/domain/<entity>.entity.ts
import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export class MyEntity {
  id: UUID;
  name: string;
  orgId: UUID;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    name: string;
    orgId: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.name = params.name;
    this.orgId = params.orgId;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
```

### 2. Repository Port

Ports are **abstract classes** (not interfaces) — NestJS uses them as DI tokens.

```typescript
// src/domain/<module>/application/ports/<entities>-repository.port.ts
import type { UUID } from 'crypto';
import type { MyEntity } from '../../domain/<entity>.entity';

export abstract class MyEntitiesRepository {
  abstract create(entity: MyEntity): Promise<void>;
  abstract findById(id: UUID): Promise<MyEntity | null>;
  abstract findByOrgId(orgId: UUID): Promise<MyEntity[]>;
  abstract update(entity: MyEntity): Promise<void>;
  abstract delete(id: UUID): Promise<void>;
}
```

### 3. Command / Query

Commands mutate state, queries read it. Plain classes with readonly fields.

```typescript
// src/domain/<module>/application/use-cases/create-<entity>/create-<entity>.command.ts
export class CreateMyEntityCommand {
  constructor(readonly name: string) {}
}
```

```typescript
// src/domain/<module>/application/use-cases/get-<entity>/get-<entity>.query.ts
import type { UUID } from 'crypto';

export class GetMyEntityQuery {
  constructor(readonly id: UUID) {}
}
```

### 4. Use Case

Use cases get user context from `ContextService`, never from command parameters.

```typescript
// src/domain/<module>/application/use-cases/create-<entity>/create-<entity>.use-case.ts
import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { MyEntitiesRepository } from '../../ports/<entities>-repository.port';
import { MyEntity } from '../../../domain/<entity>.entity';
import type { CreateMyEntityCommand } from './create-<entity>.command';

@Injectable()
export class CreateMyEntityUseCase {
  constructor(
    private readonly contextService: ContextService,
    private readonly repository: MyEntitiesRepository,
  ) {}

  async execute(command: CreateMyEntityCommand): Promise<MyEntity> {
    const orgId = this.contextService.get('orgId') as UUID;

    const entity = new MyEntity({
      name: command.name,
      orgId,
    });

    await this.repository.create(entity);
    return entity;
  }
}
```

### 5. Use Case Test

Tests stub ports and verify behavior through the public `execute()` method.

```typescript
// src/domain/<module>/application/use-cases/create-<entity>/create-<entity>.use-case.spec.ts
import { Test } from '@nestjs/testing';
import { CreateMyEntityUseCase } from './create-<entity>.use-case';
import { MyEntitiesRepository } from '../../ports/<entities>-repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { CreateMyEntityCommand } from './create-<entity>.command';
import { randomUUID } from 'crypto';

describe('CreateMyEntityUseCase', () => {
  let useCase: CreateMyEntityUseCase;
  let repository: jest.Mocked<MyEntitiesRepository>;

  const orgId = randomUUID();

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CreateMyEntityUseCase,
        {
          provide: MyEntitiesRepository,
          useValue: { create: jest.fn(), findById: jest.fn(), findByOrgId: jest.fn(), update: jest.fn(), delete: jest.fn() },
        },
        {
          provide: ContextService,
          useValue: { get: jest.fn().mockImplementation((key: string) => key === 'orgId' ? orgId : undefined) },
        },
      ],
    }).compile();

    useCase = module.get(CreateMyEntityUseCase);
    repository = module.get(MyEntitiesRepository);
  });

  it('should create entity with generated UUID and org context', async () => {
    const command = new CreateMyEntityCommand('Bürgerservice-Assistent');

    const result = await useCase.execute(command);

    expect(result.id).toBeDefined();
    expect(result.name).toBe('Bürgerservice-Assistent');
    expect(result.orgId).toBe(orgId);
    expect(repository.create).toHaveBeenCalledWith(result);
  });
});
```

### 6. Domain Errors

```typescript
// src/domain/<module>/application/<module>.errors.ts
export class MyEntityNotFoundError extends Error {
  constructor(id: string) {
    super(`MyEntity with id ${id} not found`);
    this.name = 'MyEntityNotFoundError';
  }
}
```

### 7. TypeORM Record

Records extend `BaseRecord` which provides `id`, `createdAt`, `updatedAt`. Use `@PrimaryColumn` (not `@PrimaryGeneratedColumn`) — IDs come from the domain layer.

```typescript
// src/domain/<module>/infrastructure/persistence/postgres/schema/<entity>.record.ts
import { Entity, Column } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';

@Entity('<table_name>')
export class MyEntityRecord extends BaseRecord {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'org_id' })
  orgId: UUID;
}
```

### 8. Mapper (Domain ↔ Record)

Bidirectional mapping between domain entities and TypeORM records.

```typescript
// src/domain/<module>/infrastructure/persistence/postgres/mappers/<entity>.mapper.ts
import { Injectable } from '@nestjs/common';
import { MyEntity } from '../../../../domain/<entity>.entity';
import { MyEntityRecord } from '../schema/<entity>.record';

@Injectable()
export class MyEntityMapper {
  toDomain(record: MyEntityRecord): MyEntity {
    return new MyEntity({
      id: record.id,
      name: record.name,
      orgId: record.orgId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(entity: MyEntity): MyEntityRecord {
    const record = new MyEntityRecord();
    record.id = entity.id;
    record.name = entity.name;
    record.orgId = entity.orgId;
    record.createdAt = entity.createdAt;
    record.updatedAt = entity.updatedAt;
    return record;
  }
}
```

### 9. Repository Implementation

```typescript
// src/domain/<module>/infrastructure/persistence/postgres/postgres-<entities>.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { MyEntitiesRepository } from '../../../application/ports/<entities>-repository.port';
import { MyEntityRecord } from './schema/<entity>.record';
import { MyEntityMapper } from './mappers/<entity>.mapper';
import type { MyEntity } from '../../../domain/<entity>.entity';

@Injectable()
export class PostgresMyEntitiesRepository extends MyEntitiesRepository {
  constructor(
    @InjectRepository(MyEntityRecord)
    private readonly repo: Repository<MyEntityRecord>,
    private readonly mapper: MyEntityMapper,
  ) {
    super();
  }

  async create(entity: MyEntity): Promise<void> {
    const record = this.mapper.toRecord(entity);
    await this.repo.save(record);
  }

  async findById(id: UUID): Promise<MyEntity | null> {
    const record = await this.repo.findOne({ where: { id } });
    return record ? this.mapper.toDomain(record) : null;
  }

  async findByOrgId(orgId: UUID): Promise<MyEntity[]> {
    const records = await this.repo.find({ where: { orgId } });
    return records.map((r) => this.mapper.toDomain(r));
  }

  async update(entity: MyEntity): Promise<void> {
    const record = this.mapper.toRecord(entity);
    await this.repo.save(record);
  }

  async delete(id: UUID): Promise<void> {
    await this.repo.delete(id);
  }
}
```

### 10. DTOs (Request/Response)

DTOs use `class-validator` decorators for validation and `@nestjs/swagger` for API docs.

```typescript
// src/domain/<module>/presenters/http/dto/create-<entity>.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMyEntityDto {
  @ApiProperty({ description: 'Name of the entity', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;
}
```

```typescript
// src/domain/<module>/presenters/http/dto/<entity>-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class MyEntityResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
```

### 11. DTO Mapper

```typescript
// src/domain/<module>/presenters/http/mappers/<entity>-dto.mapper.ts
import { Injectable } from '@nestjs/common';
import type { MyEntity } from '../../../../domain/<entity>.entity';
import { MyEntityResponseDto } from '../dto/<entity>-response.dto';

@Injectable()
export class MyEntityDtoMapper {
  toResponse(entity: MyEntity): MyEntityResponseDto {
    const dto = new MyEntityResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
```

### 12. Controller

Controllers are thin — they delegate to use cases and map DTOs.

```typescript
// src/domain/<module>/presenters/http/<entities>.controller.ts
import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/iam/authentication/application/guards/jwt-auth.guard';
import { CreateMyEntityUseCase } from '../../application/use-cases/create-<entity>/create-<entity>.use-case';
import { GetMyEntityUseCase } from '../../application/use-cases/get-<entity>/get-<entity>.use-case';
import { CreateMyEntityDto } from './dto/create-<entity>.dto';
import { CreateMyEntityCommand } from '../../application/use-cases/create-<entity>/create-<entity>.command';
import { GetMyEntityQuery } from '../../application/use-cases/get-<entity>/get-<entity>.query';
import { MyEntityDtoMapper } from './mappers/<entity>-dto.mapper';
import type { MyEntityResponseDto } from './dto/<entity>-response.dto';
import type { UUID } from 'crypto';

@ApiTags('<module>')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('<module>')
export class MyEntitiesController {
  constructor(
    private readonly createUseCase: CreateMyEntityUseCase,
    private readonly getUseCase: GetMyEntityUseCase,
    private readonly dtoMapper: MyEntityDtoMapper,
  ) {}

  @Post()
  async create(@Body() dto: CreateMyEntityDto): Promise<MyEntityResponseDto> {
    const command = new CreateMyEntityCommand(dto.name);
    const entity = await this.createUseCase.execute(command);
    return this.dtoMapper.toResponse(entity);
  }

  @Get(':id')
  async findOne(@Param('id') id: UUID): Promise<MyEntityResponseDto> {
    const query = new GetMyEntityQuery(id);
    const entity = await this.getUseCase.execute(query);
    return this.dtoMapper.toResponse(entity);
  }
}
```

### 13. Module Wiring

Bind the abstract port to the concrete implementation.

```typescript
// src/domain/<module>/<module>.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Infrastructure
import { MyEntityRecord } from './infrastructure/persistence/postgres/schema/<entity>.record';
import { PostgresMyEntitiesRepository } from './infrastructure/persistence/postgres/postgres-<entities>.repository';
import { MyEntitiesRepository } from './application/ports/<entities>-repository.port';
import { MyEntityMapper } from './infrastructure/persistence/postgres/mappers/<entity>.mapper';

// Use Cases
import { CreateMyEntityUseCase } from './application/use-cases/create-<entity>/create-<entity>.use-case';
import { GetMyEntityUseCase } from './application/use-cases/get-<entity>/get-<entity>.use-case';

// Presenters
import { MyEntitiesController } from './presenters/http/<entities>.controller';
import { MyEntityDtoMapper } from './presenters/http/mappers/<entity>-dto.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([MyEntityRecord])],
  providers: [
    // Repository binding: abstract port → concrete adapter
    {
      provide: MyEntitiesRepository,
      useClass: PostgresMyEntitiesRepository,
    },

    // Mappers
    MyEntityMapper,
    MyEntityDtoMapper,

    // Use Cases
    CreateMyEntityUseCase,
    GetMyEntityUseCase,
  ],
  controllers: [MyEntitiesController],
  exports: [CreateMyEntityUseCase, GetMyEntityUseCase],
})
export class MyModule {}
```

### 14. SUMMARY.md

Every module needs a SUMMARY.md — it's the first thing agents read before touching the module.

```markdown
<Module Name>
<One-line description>

<2-3 sentence overview of what the module does, its key entities, and how it fits into the system.>

<Paragraph describing the internal structure: entities, use cases, ports, infrastructure adapters, and cross-module dependencies.>
```

See existing examples: `src/domain/shares/SUMMARY.md`, `src/domain/agents/SUMMARY.md`.

## Wiring Checklist

After creating all files:

1. **Import the module** in `src/app.module.ts`:

   ```typescript
   import { MyModule } from './domain/<module>/<module>.module';
   // Add to imports array
   ```

2. **Generate migration** (see `ayunis-core-migrations` skill):

   ```bash
   npm run migration:generate:dev -- src/db/migrations/CreateMyEntitiesTable
   npm run migration:run:dev
   ```

3. **Validate**:

   ```bash
   npm run lint
   npx tsc --noEmit
   npm run test
   curl http://localhost:3000/api/<module>  # Test endpoint
   ```

## Key Rules

| Rule | Why |
|------|-----|
| IDs from `randomUUID()`, not database | Domain controls identity |
| Ports are abstract classes, not interfaces | NestJS needs class tokens for DI |
| `@PrimaryColumn`, not `@PrimaryGeneratedColumn` | ID comes from domain entity |
| User context from `ContextService`, not params | Consistent auth pattern |
| Domain errors, not HTTP exceptions | Use cases are transport-agnostic |
| Records extend `BaseRecord` | Consistent `id`, `createdAt`, `updatedAt` |
| Never import across module boundaries | Use ports/adapters for cross-module deps |
| Column names use `snake_case` in `@Column` | PostgreSQL convention |

## Reference Modules

Study these existing modules as examples:

- **Simple CRUD**: `src/domain/prompts/` — straightforward entity with basic operations
- **Inheritance/polymorphism**: `src/domain/shares/` — abstract entity with specialized subtypes
- **Complex domain logic**: `src/domain/agents/` — multiple use cases with cross-module dependencies
