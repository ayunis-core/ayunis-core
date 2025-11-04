# TICKET-003: Refactor MCP Integration Entity Class Hierarchy

## Description

Refactor the current MCP integration entities to implement a polymorphic class hierarchy based on authentication type rather than predefined vs custom. Create abstract base class `McpIntegration` with concrete subclasses for each auth type: `NoAuthIntegration`, `BearerTokenIntegration`, `ApiKeyIntegration`, and `OAuthIntegration` (stub).

This refactoring maintains the existing `PredefinedMcpIntegration` and `CustomMcpIntegration` distinction but reorganizes them to focus on authentication behavior.

## Acceptance Criteria

- [ ] Abstract `McpIntegration` base class created with:
  - Common fields (id, orgId, name, enabled, connectionStatus, timestamps)
  - Abstract methods: `getAuthType()`, `getAuthHeaders()`, `validateCredentials()`
  - Method to update connection status
- [ ] `NoAuthIntegration` class implemented (returns empty auth headers)
- [ ] `BearerTokenIntegration` class implemented with token storage and header generation
- [ ] `ApiKeyIntegration` class implemented with API key storage and custom header support
- [ ] `OAuthIntegration` stub class created with not-implemented errors
- [ ] Each class can be either predefined (with slug) or custom (with serverUrl)
- [ ] All classes properly handle their specific authentication logic
- [ ] Unit tests verify polymorphic behavior for each integration type
- [ ] Unit tests verify auth header generation for each type
- [ ] Existing functionality preserved (no breaking changes)

## Dependencies

- TICKET-001 (Updated McpAuthMethod enum required)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Large

## Technical Notes

Files to modify/create in `ayunis-core-backend/src/domain/mcp/domain/`:
- Refactor `mcp-integration.entity.ts` to abstract base class
- Create `no-auth-integration.entity.ts`
- Create `bearer-token-integration.entity.ts`
- Create `api-key-integration.entity.ts`
- Create `oauth-integration.entity.ts` (stub for future)

Key design principle: Each integration type encapsulates its own authentication logic through polymorphism, eliminating the need for complex conditionals.