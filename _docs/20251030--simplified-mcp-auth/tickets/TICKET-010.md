# TICKET-010: Update MCP Integration DTOs

## Description

Update the Data Transfer Objects (DTOs) for MCP integrations to support the simplified authentication model. Ensure DTOs properly validate input based on authentication type and include fields for connection status.

## Acceptance Criteria

- [ ] `CreateMcpIntegrationDto` updated to include:
  - Optional `authMethod` field with enum validation
  - Flexible `credentials` object for different auth types
  - Validation rules based on auth method
- [ ] `UpdateMcpIntegrationDto` supports credential updates
- [ ] `McpIntegrationResponseDto` includes:
  - Connection status fields
  - Auth method type (but not sensitive credentials)
  - Last connection check timestamp
- [ ] DTOs use `class-validator` decorators appropriately
- [ ] DTOs include `@ApiProperty()` decorators for OpenAPI
- [ ] Unit tests verify DTO validation rules
- [ ] Unit tests verify sensitive data is not exposed in responses

## Dependencies

- TICKET-001 (Updated enum for validation)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Small

## Technical Notes

Files to update in `ayunis-core-backend/src/domain/mcp/application/dtos/`:
- `create-mcp-integration.dto.ts`
- `update-mcp-integration.dto.ts`
- `mcp-integration-response.dto.ts`

Ensure credentials are never exposed in response DTOs. The response should only indicate whether authentication is configured, not the actual values.