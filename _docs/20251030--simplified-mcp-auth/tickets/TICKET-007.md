# TICKET-007: Update MCP Integration Repository

## Description

Update the MCP integration repository to work with the new polymorphic entity structure and Single Table Inheritance. The repository must properly query and persist different integration types while maintaining type safety.

## Acceptance Criteria

- [x] Repository updated to work with base `McpIntegrationRecord` and child entities
- [x] `findById()` returns correct entity subclass using mapper
- [x] `findByOrgId()` returns array of mixed entity types
- [x] `findByOrgAndSlug()` correctly queries predefined integrations (N/A - method not needed in current implementation)
- [x] `save()` persists correct record type based on entity
- [x] `delete()` removes integrations regardless of type
- [x] Repository properly handles TypeORM's STI queries
- [x] Unit tests verify CRUD operations for each integration type
- [x] Unit tests verify filtering by organization works correctly
- [x] Unit tests verify unique constraint on org+slug is enforced

## Dependencies

- TICKET-004 (TypeORM records structure)
- TICKET-006 (Mapper must be updated)

## Status

- [x] To Do
- [x] In Progress
- [x] Done

## Complexity

Medium

## Technical Notes

Update file: `ayunis-core-backend/src/domain/mcp/infrastructure/persistence/postgres/mcp-integrations.repository.ts`

Key considerations:
- TypeORM automatically handles STI queries
- Use base record type for repository injection: `@InjectRepository(McpIntegrationRecord)`
- The mapper will handle type conversion
- Ensure proper error handling for database constraints