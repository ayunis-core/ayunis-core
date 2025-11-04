# TICKET-005: Create MCP Integration Factory

## Description

Implement a factory service that creates the appropriate MCP integration entity based on authentication type. The factory handles both creating new integrations and reconstructing domain entities from database records, supporting the polymorphic design.

## Acceptance Criteria

- [ ] `McpIntegrationFactory` created as an `@Injectable()` service
- [ ] `create()` method creates new integration based on auth type:
  - Accepts: authType, orgId, name, serverUrl/slug, and type (predefined/custom)
  - Returns appropriate integration subclass instance
  - Throws error for unknown auth types
- [ ] `fromRecord()` method reconstructs domain entity from TypeORM record:
  - Determines correct entity type from record discriminator
  - Properly maps all fields including type-specific ones
  - Handles both predefined and custom integrations
- [ ] Factory properly sets all fields including connection status
- [ ] Unit tests verify correct entity type creation for each auth method
- [ ] Unit tests verify record-to-entity mapping preserves all data
- [ ] Unit tests verify error handling for unknown types

## Dependencies

- TICKET-003 (Domain entities must exist)
- TICKET-004 (TypeORM records must exist)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Medium

## Technical Notes

Create file: `ayunis-core-backend/src/domain/mcp/application/factories/mcp-integration.factory.ts`

The factory encapsulates the logic for:
1. Creating new domain entities based on auth type
2. Reconstructing entities from database records
3. Determining whether integration is predefined (has slug) or custom (has serverUrl)

This factory will be used by both use cases and the mapper.