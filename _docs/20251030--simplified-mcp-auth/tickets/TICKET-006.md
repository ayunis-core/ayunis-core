# TICKET-006: Update MCP Integration Mapper

## Description

Update the MCP integration mapper to handle the new polymorphic entity structure and Single Table Inheritance. The mapper must correctly convert between domain entities and TypeORM records, determining the appropriate subclass based on the authentication type.

## Acceptance Criteria

- [ ] `McpIntegrationMapper` updated to handle polymorphic entities
- [ ] `toDomain()` method:
  - Determines entity type from record's discriminator value
  - Uses factory to create appropriate entity subclass
  - Maps all common and type-specific fields correctly
  - Handles both predefined and custom integrations
- [ ] `toRecord()` method:
  - Creates appropriate record subclass based on entity type
  - Maps all fields including encrypted credentials
  - Preserves authentication type discriminator
- [ ] Mapper injects and uses `McpIntegrationFactory`
- [ ] Unit tests verify correct mapping for each entity type
- [ ] Unit tests verify round-trip conversion (entity → record → entity)
- [ ] Unit tests verify all fields are preserved during mapping

## Dependencies

- TICKET-004 (TypeORM records must exist)
- TICKET-005 (Factory must be available)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Medium

## Technical Notes

Update file: `ayunis-core-backend/src/domain/mcp/infrastructure/persistence/postgres/mappers/mcp-integration.mapper.ts`

The mapper should:
1. Use `instanceof` checks to determine entity types
2. Delegate entity creation to the factory
3. Handle nullable fields appropriately
4. Preserve all metadata (timestamps, connection status)