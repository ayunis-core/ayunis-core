# TICKET-008: Implement Create Custom Integration Use Case

## Description

Implement the use case for creating a custom MCP integration with user-provided server URL. Validates the URL, encrypts credentials, optionally validates connection, and persists.

## Acceptance Criteria

- [ ] `CreateCustomMcpIntegrationCommand` created with fields: `name`, `serverUrl`, `organizationId`, `authMethod?`, `authHeaderName?`, `encryptedCredentials?`
- [ ] Use case created in same file as TICKET-007 (shared use case for both commands)
- [ ] Use case validates URL format (basic validation)
- [ ] Use case retrieves `orgId` from `ContextService`
- [ ] Use case creates `CustomMcpIntegration` entity
- [ ] Use case saves via repository
- [ ] Domain error `InvalidServerUrlError` added
- [ ] Unit tests cover success and error paths
- [ ] Tests verify orgId from context, not command

## Dependencies

- TICKET-002, TICKET-004

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Medium

## Technical Notes

Same use case class as TICKET-007, overloaded `execute()` method or conditional logic based on command type.
