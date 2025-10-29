# TICKET-008: Implement Create Custom Integration Use Case

## Description

Implement the use case for creating a custom MCP integration with user-provided server URL. Validates the URL, encrypts credentials, optionally validates connection, and persists.

## Acceptance Criteria

- [x] `CreateCustomMcpIntegrationCommand` created with fields: `name`, `serverUrl`, `authMethod?`, `authHeaderName?`, `encryptedCredentials?` (organizationId removed per ContextService pattern)
- [x] Use case created in same file as TICKET-007 (shared use case for both commands)
- [x] Use case validates URL format (basic validation)
- [x] Use case retrieves `orgId` from `ContextService`
- [x] Use case creates `CustomMcpIntegration` entity
- [x] Use case saves via repository
- [x] Domain error `InvalidServerUrlError` added
- [x] Unit tests cover success and error paths
- [x] Tests verify orgId from context, not command

## Dependencies

- TICKET-002, TICKET-004

## Status

- [x] To Do
- [x] In Progress
- [x] Done

## Complexity

Medium

## Technical Notes

Same use case class as TICKET-007, overloaded `execute()` method or conditional logic based on command type.
