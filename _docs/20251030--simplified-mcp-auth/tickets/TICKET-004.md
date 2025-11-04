# TICKET-004: Create TypeORM Records with Single Table Inheritance

## Description

Implement TypeORM entity records using Single Table Inheritance (STI) pattern to map the polymorphic domain entities to the database. Create base record class with `@TableInheritance` decorator and child records for each authentication type.

## Acceptance Criteria

- [ ] `McpIntegrationRecord` base class created with:
  - `@Entity('mcp_integrations')` decorator
  - `@TableInheritance({ column: { type: 'varchar', name: 'auth_type' } })` decorator
  - All common columns mapped
  - Extends `BaseRecord` from common infrastructure
- [ ] `NoAuthIntegrationRecord` created with `@ChildEntity('NO_AUTH')` decorator
- [ ] `BearerTokenIntegrationRecord` created with auth token columns
- [ ] `ApiKeyIntegrationRecord` created with API key columns
- [ ] `OAuthIntegrationRecord` created with OAuth-specific columns (stub)
- [ ] Proper column naming with snake_case (e.g., `org_id`, `connection_status`)
- [ ] Index on `(org_id, predefined_slug)` with unique constraint where predefined_slug is not null
- [ ] Unit tests verify TypeORM can instantiate correct record types
- [ ] Unit tests verify inheritance chain works correctly

## Dependencies

- TICKET-002 (Database migration must exist)
- TICKET-003 (Domain entities must be defined)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Medium

## Technical Notes

Files to create in `ayunis-core-backend/src/domain/mcp/infrastructure/persistence/postgres/schema/`:
- `mcp-integration.record.ts` (base with STI)
- `no-auth-integration.record.ts`
- `bearer-token-integration.record.ts`
- `api-key-integration.record.ts`
- `oauth-integration.record.ts`

Each child entity uses `@ChildEntity(discriminatorValue)` where discriminatorValue matches the `McpAuthMethod` enum values.