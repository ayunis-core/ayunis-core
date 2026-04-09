---
name: use-case-reference
description: "Reference implementation for backend use cases — error handling, structure, and patterns. MUST be loaded when creating or modifying any *.use-case.ts file."
---

# Use Case Reference Implementation

This skill defines the canonical use case structure. Every use case MUST follow this pattern.

The structural rules (try/catch shape, error wrapping, single `execute()` method, repository injection via interface) are non-negotiable. Things that **vary by project** — exact import paths, auth context handling, domain model style — are marked with `// ...` placeholders and inline comments.

## Structure

```typescript
import { Injectable, Logger } from '@nestjs/common';
// ApplicationError base class — exact import path varies by project
import { ApplicationError } from '...';
// Module-specific errors
import { EntityNotFoundError, UnexpectedEntityError } from '../../entity.errors';
// Repository class — the type doubles as the DI token (no @Inject() needed)
import { EntityRepository } from '...';

interface DoSomethingCommand {
  entityId: string;
  // ... other command fields
}

@Injectable()
export class DoSomethingUseCase {
  private readonly logger = new Logger(DoSomethingUseCase.name);

  constructor(
    private readonly entityRepository: EntityRepository,
    // ... other dependencies (other use cases, infra services, etc.)
  ) {}

  async execute(command: DoSomethingCommand): Promise<Entity> {
    this.logger.log('Doing something', { entityId: command.entityId });

    try {
      // 1. Auth context — handling varies by project, see Rule 5 below

      // 2. Precondition checks (existence, permissions, business rules)
      // (multi-tenant projects typically pass userId here for tenant isolation)
      const entity = await this.entityRepository.findOne(command.entityId);
      if (!entity) {
        throw new EntityNotFoundError(command.entityId);
      }

      // 3. Business logic — mutate, orchestrate, call other use cases / repos
      //    (style varies: rich domain methods like entity.updateName(...), or
      //    anemic record updates — follow your project's convention)

      // 4. Persist and return
      return await this.entityRepository.save(entity);

    } catch (error) {
      // 5. Error handling — REQUIRED in every use case
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error doing something', { error: error as Error });
      throw new UnexpectedEntityError(error);
    }
  }
}
```

## Rules

### 1. Every `execute()` method MUST be wrapped in try/catch

The catch block follows this exact pattern:

```typescript
catch (error) {
  if (error instanceof ApplicationError) throw error;
  this.logger.error('<descriptive context>', { error: error as Error });
  throw new UnexpectedModuleError(error);
}
```

- **Re-throw `ApplicationError`** subclasses as-is — these are domain errors with proper status codes
- **Log unexpected errors** with context (what operation failed)
- **Wrap in a module-specific `Unexpected*Error`** — never let raw errors escape

### 2. Never throw HTTP exceptions from use cases

```typescript
// WRONG ✗ — couples domain to HTTP
throw new UnauthorizedException('User not authenticated');
throw new NotFoundException('Entity not found');

// CORRECT ✓ — domain errors
throw new UnauthorizedAccessError();
throw new EntityNotFoundError(entityId);
```

Use cases throw `ApplicationError` subclasses. The global exception filter converts them to HTTP responses.

### 3. One operation per file, one `execute()` per use case

A use case is a single business operation. Don't bundle multiple operations into one class with `execute1()` / `execute2()`. If you need two operations, write two use cases.

### 4. Inject repositories via the repository class — never database clients directly

Use cases depend on a repository class. They MUST NOT import a database client (TypeORM, Drizzle, raw `pg`, etc.) directly. This keeps the use case testable without a real database.

```ts
constructor(
  private readonly entityRepository: EntityRepository,
) {}
```

Whether `EntityRepository` is an **abstract class** with a separate concrete implementation bound via `{ provide: EntityRepository, useClass: ConcreteRepository }` (port/adapter pattern), or a **single concrete class** registered directly in `providers: [EntityRepository]`, is a project-level decision — see your project's structural conventions skill. In both cases the use case constructor looks the same: TypeScript reflection picks up the class as the DI token, so **no `@Inject()` decorator is needed**.

### 5. Auth context — varies by project

Auth handling is a project-level convention. Common patterns:

- **`ContextService` / async-local-storage**: read the current user from a request-scoped context service

  ```typescript
  const userId = this.contextService.get('userId');
  if (!userId) throw new UnauthorizedAccessError();
  ```

- **Command parameter**: the controller (or a guard) injects `userId` into the command before calling the use case
- **Guard + decorator**: an auth guard runs before the controller and rejects unauthenticated requests; use cases assume auth has already passed

Whichever pattern your project uses, apply it consistently inside `execute()`. **Never** accept `userId` ad-hoc in some use cases and not others.

### 6. Validate preconditions before mutating

Always check existence and permissions before performing writes:

```typescript
// (multi-tenant projects typically pass userId for tenant isolation)
const entity = await this.repository.findOne(id);
if (!entity) {
  throw new EntityNotFoundError(id);
}
// Only then proceed with mutation
```

### 7. Each module has its own errors file

Errors live in a module-specific errors file (e.g. `application/<module>.errors.ts`):

```typescript
// ApplicationError import path varies by project
import { ApplicationError } from '...';

export enum EntityErrorCode {
  ENTITY_NOT_FOUND = 'ENTITY_NOT_FOUND',
  UNEXPECTED_ENTITY_ERROR = 'UNEXPECTED_ENTITY_ERROR',
  // ... other codes
}

export abstract class EntityError extends ApplicationError {
  constructor(message: string, code: EntityErrorCode, statusCode: number = 400) {
    super(message, code, statusCode);
  }
}

export class EntityNotFoundError extends EntityError {
  constructor(entityId: string) {
    super(`Entity with ID ${entityId} not found`, EntityErrorCode.ENTITY_NOT_FOUND, 404);
  }
}

export class UnexpectedEntityError extends EntityError {
  constructor(error: unknown) {
    // If your project's `ApplicationError` accepts a metadata object as a 4th
    // arg (some do, some don't), pass `{ error }` for context.
    super('Unexpected error occurred', EntityErrorCode.UNEXPECTED_ENTITY_ERROR, 500);
  }
}
```

Every module MUST have an `Unexpected*Error` class for the catch block.

### 8. Logger — use the class name, log entry and errors

```typescript
private readonly logger = new Logger(MyUseCase.name);

// At the start of execute():
this.logger.log('Descriptive action', { relevantId: command.id });

// In catch block:
this.logger.error('Error descriptive action', { error: error as Error });
```

## Checklist

When creating or modifying a use case, verify:

- [ ] `execute()` body is wrapped in try/catch
- [ ] Catch block re-throws `ApplicationError`, logs and wraps everything else
- [ ] No HTTP exceptions (`NotFoundException`, `UnauthorizedException`, etc.)
- [ ] Auth context handled per the project's convention (Rule 5)
- [ ] Preconditions checked before mutations (entity exists, permissions valid)
- [ ] Repositories injected via DI token (interface), not concrete class
- [ ] Module has an `Unexpected*Error` class in its errors file
- [ ] Logger uses class name, logs entry point and errors
