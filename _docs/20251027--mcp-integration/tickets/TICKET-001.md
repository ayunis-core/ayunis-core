# TICKET-001: Refactor Sources Module - SourceCreator Enum

## Description

Replace the `createdByLLM` boolean field in the sources module with a `createdBy` enum that supports three values: `user`, `llm`, and `system`. This change is required to support MCP integrations creating CSV resources as system-generated sources (distinct from user-uploaded or LLM-generated sources).

**Why**: The MCP integration feature needs to mark CSV resources fetched from MCP servers as system-created. The current boolean field only distinguishes between user and LLM sources, which is insufficient.

**Technical Approach**:
1. Create new `SourceCreator` enum in sources domain
2. Update `DataSource` domain entity to use enum instead of boolean
3. Update database record and create migration
4. Update all use cases that reference `createdByLLM`
5. Update DTOs and mappers

## Acceptance Criteria

- [ ] `SourceCreator` enum created in `src/domain/sources/domain/source-creator.enum.ts` with values: `USER`, `LLM`, `SYSTEM`
- [ ] `DataSource` entity updated: `createdByLLM: boolean` replaced with `createdBy: SourceCreator`
- [ ] `DataSourceRecord` updated with enum column type
- [ ] Database migration created and tested (converts existing boolean values to enum)
- [ ] `CreateCSVDataSourceCommand` updated to accept `createdBy: SourceCreator` parameter
- [ ] All uses of `createdByLLM` in sources module updated to check `createdBy === SourceCreator.LLM`
- [ ] DataSource mapper updated to handle new enum field
- [ ] Unit tests added for:
  - Enum values are correctly assigned in domain entity
  - Migration correctly converts boolean to enum
  - Mapper correctly converts between entity and record
  - Use cases correctly handle all three creator types
- [ ] Migration runs successfully on clean database
- [ ] Migration runs successfully on database with existing data sources

## Dependencies

None - this is a foundation ticket

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Small

## Technical Notes

**Files to modify**:
- `src/domain/sources/domain/data-source.entity.ts`
- `src/domain/sources/infrastructure/persistence/postgres/schema/data-source.record.ts`
- `src/domain/sources/infrastructure/persistence/postgres/mappers/data-source.mapper.ts`
- `src/domain/sources/application/use-cases/create-data-source/create-data-source.command.ts`
- Any code checking `if (dataSource.createdByLLM)` → `if (dataSource.createdBy === SourceCreator.LLM)`

**Files to create**:
- `src/domain/sources/domain/source-creator.enum.ts`
- `src/db/migrations/YYYYMMDDHHMMSS-RefactorSourceCreatorEnum.ts` (TypeORM migration)

**Migration Strategy**:
```typescript
// Existing records with createdByLLM = true → createdBy = 'llm'
// Existing records with createdByLLM = false → createdBy = 'user'
// Default value for new records: 'user'
```

**Testing Approach**:
- Unit test enum assignment in entity constructor
- Unit test migration up/down (use TypeORM test utilities)
- Unit test mapper bidirectional conversion
- Unit test use case commands accept all enum values
