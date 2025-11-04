# TICKET-011: Update Predefined Integration Registry

## Description

Update the predefined integration registry to support the new authentication types and provide proper configuration for Locaboo and future predefined integrations. The registry should specify auth methods and required credential fields for each integration type.

## Acceptance Criteria

- [ ] Registry updated to specify `authType` for each predefined integration
- [ ] Locaboo configuration uses `BEARER_TOKEN` auth type
- [ ] Registry provides credential field definitions:
  - Field name, label, type (text/password)
  - Required/optional status
  - Help text for users
- [ ] Registry specifies auth header name for each integration
- [ ] `getServerUrl()` method returns correct MCP endpoint URLs
- [ ] Registry reads `LOCABOO_4_URL` from environment config
- [ ] Unit tests verify Locaboo configuration is correct
- [ ] Unit tests verify registry handles missing env variables gracefully

## Dependencies

- TICKET-001 (Updated auth method enum)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Small

## Technical Notes

Update file: `ayunis-core-backend/src/domain/mcp/infrastructure/predefined/predefined-registry.service.ts`

Locaboo configuration should specify:
- authType: `McpAuthType.BEARER_TOKEN`
- authHeaderName: `'Authorization'`
- credentialFields: Single field for API token input
- Help text explaining the token is from Locaboo 3