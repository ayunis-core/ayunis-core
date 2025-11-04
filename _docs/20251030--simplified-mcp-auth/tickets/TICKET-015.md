# TICKET-015: Update Environment Configuration Documentation

## Description

Update environment variable documentation and example files to include the new MCP encryption key requirement and Locaboo 4 URL configuration. Ensure deployment documentation reflects the simplified authentication approach.

## Acceptance Criteria

- [ ] `.env.example` updated with:
  - `MCP_ENCRYPTION_KEY` with generation instructions
  - `LOCABOO_4_URL` with example value
- [ ] README or deployment docs updated to explain:
  - How to generate encryption key: `openssl rand -hex 32`
  - Locaboo 4 URL configuration requirements
  - Simplified auth approach (no OAuth complexity)
- [ ] Migration notes created for the deployment:
  - Database migration steps
  - No data migration needed (confirmed no production integrations)
  - Rollback procedure if needed
- [ ] Configuration validation on startup documented
- [ ] Security best practices for token storage documented

## Dependencies

None - can be done in parallel

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Small

## Technical Notes

Files to update:
- `ayunis-core-backend/.env.example`
- `ayunis-core/README.md` or `DEPLOYMENT.md`
- Create migration guide if needed

Ensure documentation is clear that:
1. MCP_ENCRYPTION_KEY is required (app won't start without it)
2. Bearer tokens are stored encrypted at rest
3. No automatic token refresh for Bearer tokens