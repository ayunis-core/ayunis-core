# TICKET-013: Add Integration Tests for Simplified Auth Flow

## Description

Create comprehensive integration tests to verify the complete simplified MCP authentication flow works end-to-end. Tests should cover all authentication types and verify the system behaves correctly from API endpoint through to MCP operations.

## Acceptance Criteria

- [ ] Integration tests for NO_AUTH integrations:
  - Create, retrieve, execute operations
- [ ] Integration tests for BEARER_TOKEN integrations:
  - Create with token, validate encryption, execute operations
  - Test invalid token handling
- [ ] Integration tests for API_KEY integrations:
  - Similar to bearer token tests
  - Test custom header name support
- [ ] Test connection validation for each auth type
- [ ] Test connection status updates on success/failure
- [ ] Test unique constraint for Locaboo integrations
- [ ] Test credential update flow
- [ ] Mock MCP server responses for testing
- [ ] All tests pass in CI/CD pipeline

## Dependencies

- TICKET-009 (Use cases must be complete)
- TICKET-011 (Predefined registry must be updated)
- TICKET-012 (Module configuration must be complete)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Large

## Technical Notes

Create test files:
- `ayunis-core-backend/test/mcp/mcp-auth-simplified.e2e-spec.ts`
- `ayunis-core-backend/test/mcp/mcp-integration-types.e2e-spec.ts`

Use test fixtures for:
- Mock MCP server responses
- Test organization and user context
- Various auth credential scenarios