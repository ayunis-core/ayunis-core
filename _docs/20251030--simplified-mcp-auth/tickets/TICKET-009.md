# TICKET-009: Update Create MCP Integration Use Case

## Description

Update the create MCP integration use case to work with the new polymorphic entity structure and factory pattern. The use case should create the appropriate integration type based on the auth method, handle credential encryption, and validate connections.

## Acceptance Criteria

- [ ] Use case uses `McpIntegrationFactory` to create entities
- [ ] Handles NO_AUTH integrations (no credentials needed)
- [ ] Handles BEARER_TOKEN integrations:
  - Validates API token is provided
  - Encrypts token using `McpCredentialEncryptionService`
  - Sets auth header name from predefined config
- [ ] Handles API_KEY integrations similarly to bearer tokens
- [ ] Returns error for OAUTH type (not implemented)
- [ ] Validates connection after creation (on-demand validation)
- [ ] Updates connection status based on validation result
- [ ] Enforces single Locaboo integration per organization
- [ ] Unit tests verify entity creation for each auth type
- [ ] Unit tests verify credential encryption
- [ ] Unit tests verify validation flow

## Dependencies

- TICKET-005 (Factory must exist)
- TICKET-007 (Repository must be updated)
- TICKET-008 (MCP client service must be updated)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Large

## Technical Notes

Update file: `ayunis-core-backend/src/domain/mcp/application/use-cases/create-mcp-integration/create-mcp-integration.use-case.ts`

The use case should:
1. Get org context from `ContextService`
2. Look up predefined config from registry
3. Use factory to create appropriate entity type
4. Encrypt credentials if needed
5. Validate connection (don't throw on failure, just update status)
6. Save via repository