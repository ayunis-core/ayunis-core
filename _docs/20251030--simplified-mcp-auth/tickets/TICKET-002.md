# TICKET-002: Create TypeORM Migration for Single Table Inheritance

## Description

Generate and configure a TypeORM migration to implement Single Table Inheritance (STI) for MCP integrations. This will create a unified `mcp_integrations` table with a discriminator column (`auth_type`) and type-specific nullable columns for different authentication methods.

## Acceptance Criteria

- [ ] Migration generated using `npm run migration:generate:dev "SimplifyMcpAuthWithSTI"`
- [ ] Table includes discriminator column `auth_type` (varchar)
- [ ] Table includes base columns: id, org_id, name, enabled, created_at, updated_at
- [ ] Table includes type-specific columns:
  - For predefined integrations: `predefined_slug` (nullable)
  - For custom integrations: `server_url` (nullable)
  - For Bearer/API auth: `auth_header_name`, `encrypted_credentials` (nullable)
  - For future OAuth: `oauth_client_id`, `oauth_client_secret`, `oauth_access_token`, `oauth_refresh_token`, `oauth_token_expires_at` (all nullable)
- [ ] Connection status columns added: `connection_status`, `last_connection_error`, `last_connection_check`
- [ ] Unique constraint on `(org_id, predefined_slug)` where `predefined_slug IS NOT NULL`
- [ ] Migration can be rolled back successfully
- [ ] Unit tests verify migration runs without errors

## Dependencies

- TICKET-001 (McpAuthMethod enum must be updated first)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Medium

## Technical Notes

Run from `ayunis-core-backend/` directory:
```bash
npm run migration:generate:dev "SimplifyMcpAuthWithSTI"
```

Review the generated migration file carefully before committing. The table should support TypeORM's `@TableInheritance` decorator with the `auth_type` column as discriminator.