# TICKET-012: Update MCP Module Providers

## Description

Update the MCP module's dependency injection configuration to register all new services and factories. Ensure proper provider registration for the factory, updated mapper, and any new services.

## Acceptance Criteria

- [ ] `McpIntegrationFactory` registered as provider
- [ ] Updated mapper properly injected with factory
- [ ] All TypeORM entities registered in `TypeOrmModule.forFeature()`
- [ ] Repository provider updated if needed
- [ ] Service dependencies properly configured
- [ ] Module exports necessary services for use by other modules
- [ ] No circular dependency issues
- [ ] Application starts without dependency injection errors
- [ ] Unit tests verify module can be imported successfully

## Dependencies

- TICKET-005 (Factory must exist)
- TICKET-006 (Mapper must be updated)
- TICKET-007 (Repository must be updated)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Small

## Technical Notes

Update file: `ayunis-core-backend/src/domain/mcp/mcp.module.ts`

Ensure:
1. Factory is registered as a provider
2. TypeORM entities include all record classes
3. Check for any OAuth-related providers that should be removed
4. Verify all use cases have their dependencies available