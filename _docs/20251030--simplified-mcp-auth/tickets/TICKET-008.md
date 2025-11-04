# TICKET-008: Refactor MCP Client Service for Polymorphic Auth

## Description

Refactor the MCP client service to leverage the polymorphic authentication design. Instead of complex conditionals, the service should delegate auth header generation to the integration entities themselves, with special handling only for decryption of encrypted credentials.

## Acceptance Criteria

- [ ] MCP client service refactored to use polymorphic `getAuthHeaders()` method
- [ ] Service handles credential decryption for Bearer and API key integrations
- [ ] Service properly configures MCP connection based on auth headers
- [ ] Connection validation method updated to use new auth approach
- [ ] Error handling for authentication failures (401 responses)
- [ ] Connection status updates on integration entity after operations
- [ ] Remove any OAuth strategy pattern code if present
- [ ] Unit tests verify auth header generation for each type
- [ ] Unit tests verify encrypted credential handling
- [ ] Unit tests verify connection validation logic

## Dependencies

- TICKET-003 (Polymorphic entities with getAuthHeaders method)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Medium

## Technical Notes

Update file: `ayunis-core-backend/src/domain/mcp/infrastructure/services/mcp-client.service.ts`

Key changes:
1. Remove any complex auth strategy logic
2. Use `instanceof` checks only for decryption handling
3. Delegate to entity's `getAuthHeaders()` for auth configuration
4. Inject `McpCredentialEncryptionService` for decryption
5. Update connection status on entity after operations