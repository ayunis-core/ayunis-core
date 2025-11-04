# Product Requirements Document: Simplified MCP Authentication

## Problem Statement

The current proposed MCP authentication architecture for Ayunis Core is overly complex:
- Three-tier authentication system (NO_AUTH/OAUTH_STANDARD/OAUTH_CUSTOM)
- OAuth strategy pattern for handling different authentication flows
- Complex token refresh logic for Locaboo's custom OAuth
- Separate database columns for different OAuth types
- ~500 lines of OAuth handling code

This complexity stems from attempting to support Locaboo 4's fake OAuth implementation alongside standard OAuth. However, since Locaboo 4 can be simplified to use direct Bearer token authentication, Ayunis Core can also be significantly simplified.

## User Stories

### As an Organization Administrator
- I want to easily configure MCP integrations
- So that our AI agents can access external data
- Without complex OAuth flows or token management

### As a Developer
- I want simple, maintainable authentication code
- So that I can easily add new MCP integrations
- Without implementing complex OAuth strategies

### As a System Administrator
- I want straightforward deployment and configuration
- So that MCP integrations are reliable
- Without managing OAuth endpoints and refresh tokens

## Functional Requirements

### FR1: Simplified Authentication Types
- Support three simple authentication methods:
  - NO_AUTH: No authentication required
  - BEARER_TOKEN: Simple Bearer token (for Locaboo and API keys)
  - OAUTH: Standard OAuth 2.1 (for future use)

### FR2: Direct Token Management
- Store Bearer tokens directly (encrypted)
- No token refresh logic for Bearer tokens
- Simple token validation through MCP SDK

### FR3: Locaboo Integration
- Accept Locaboo 3 API token from user
- Store as Bearer token
- Pass directly to Locaboo 4 MCP server

### FR4: Database Simplification
- Single auth token field for Bearer tokens
- Separate OAuth fields only for standard OAuth (future)
- Clear, understandable schema

## Non-Functional Requirements

### NFR1: Security
- Encrypt all tokens at rest (AES-256-GCM)
- Never log token values
- HTTPS only in production

### NFR2: Performance
- No unnecessary token transformations
- Direct token passing to MCP servers
- Minimal database queries

### NFR3: Maintainability
- Remove OAuth strategy pattern
- Eliminate complex refresh logic
- Reduce codebase by ~70%

### NFR4: Extensibility
- Keep OAuth fields for future standard implementations
- Clear separation between auth types
- Easy to add new authentication methods

## Acceptance Criteria

### AC1: Authentication Simplification
- [ ] Three simple auth types implemented
- [ ] OAuth strategy pattern removed
- [ ] Token refresh logic removed
- [ ] All tests passing

### AC2: Locaboo Integration
- [ ] Can create Locaboo integration with API token
- [ ] Token stored encrypted
- [ ] MCP operations work with Bearer token

### AC3: Database Migration
- [ ] TypeORM entities updated
- [ ] Migration generated and tested
- [ ] No data loss (if existing integrations)

### AC4: Frontend Compatibility
- [ ] UI works with simplified auth
- [ ] No changes needed to user flow
- [ ] API client regenerated

## Out of Scope

- Standard OAuth 2.1 implementation (future phase)
- Multiple Locaboo integrations per organization
- Token refresh for Bearer tokens
- Automatic token rotation

## Dependencies

- Locaboo 4 must implement simplified Bearer auth
- MCP SDK must support Bearer token in headers
- Coordinated deployment with Locaboo 4

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing integrations | High | No existing integrations in production |
| Locaboo token expiration | Low | Tokens are long-lived, manual refresh |
| Future OAuth complexity | Medium | Keep OAuth fields in schema |

## Success Metrics

- Code reduction: 70% fewer lines
- Complexity: 3 auth types instead of complex strategy
- Performance: No token refresh overhead
- Reliability: Simpler code, fewer failure points

## Timeline

- Phase 1: Backend refactoring (2 days)
- Phase 2: Database migration (1 day)
- Phase 3: Testing (1 day)
- Phase 4: Documentation (0.5 days)

Total: 4.5 days

## Review Sign-off

- [ ] Product Owner
- [ ] Technical Lead
- [ ] Security Review
- [ ] QA Lead

---

_Document Version: 1.0_
_Created: 2024-10-30_
_Status: Approved_