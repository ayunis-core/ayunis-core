# TICKET-001: Add NO_AUTH and OAUTH to McpAuthMethod Enum

## Description

Update the `McpAuthMethod` enum to include `NO_AUTH` for integrations that don't require authentication and `OAUTH` as a placeholder for future OAuth 2.1 implementations. This is the foundation for the simplified authentication approach.

**File to modify**: `ayunis-core-backend/src/domain/mcp/domain/mcp-auth-method.enum.ts`

## Acceptance Criteria

- [ ] `NO_AUTH` enum value added to `McpAuthMethod`
- [ ] `OAUTH` enum value added to `McpAuthMethod` (for future use)
- [ ] Existing `API_KEY` and `BEARER_TOKEN` values remain unchanged
- [ ] Unit tests verify all enum values are accessible
- [ ] No breaking changes to existing code using the enum

## Dependencies

None - this is a foundation ticket

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Small

## Technical Notes

This is a simple enum extension. The current enum has:
- `API_KEY = 'API_KEY'`
- `BEARER_TOKEN = 'BEARER_TOKEN'`

Add:
- `NO_AUTH = 'NO_AUTH'`
- `OAUTH = 'OAUTH'`