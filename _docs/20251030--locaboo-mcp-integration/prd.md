# Product Requirements Document: Locaboo 4 MCP Integration

## Problem Statement

Organizations using Ayunis Core need to access Locaboo 4 booking system data (bookings, resources, services, inventory) within their AI agents. Currently, there is no predefined integration for Locaboo 4 in Ayunis Core's MCP client, requiring manual configuration or preventing integration entirely.

The Locaboo 4 MCP server exists and is functional but requires OAuth 2.1 token exchange using Locaboo 3 API tokens. Users need a seamless way to configure this integration within Ayunis Core without understanding the underlying OAuth complexity.

Additionally, the current MCP authentication system in Ayunis Core supports API_KEY and BEARER_TOKEN methods, which adds unnecessary complexity. This needs to be simplified to support only two authentication patterns: no authentication or OAuth-based authentication.

## User Stories

### As an Organization Administrator

- I want to add Locaboo 4 as an MCP integration to my organization
- So that our AI agents can access booking, resource, service, and inventory data
- I should be able to provide my Locaboo 3 API token and have everything else handled automatically

### As an Agent User

- I want to use Locaboo 4 data in my conversations with AI agents
- So that I can query bookings, check resource availability, and access service information
- I should see clear error messages if the integration has connection issues

### As a System Administrator

- I want to configure the Locaboo 4 server URL via environment variable
- So that I can control which Locaboo 4 instance all organizations connect to
- Without exposing infrastructure details to end users

## Functional Requirements

### FR1: Authentication Method Refactoring

- Replace existing `McpAuthMethod` enum (API_KEY, BEARER_TOKEN) with new simplified approach
- Support only two authentication patterns:
  - **NO_AUTH**: No authentication required (public MCP servers)
  - **OAUTH**: OAuth 2.1 client credentials flow
- For OAuth authentication:
  - Store OAuth endpoint URL (e.g., `/mcp/oauth/token`)
  - Store client credentials (encrypted)
  - Store obtained access token and expiration
  - Automatically refresh tokens when expired
- No migration needed - there are no existing integrations in production
- Clean overwrite of authentication system is safe

### FR2: Predefined Integration Registry

- Add `LOCABOO` to the `PredefinedMcpIntegrationSlug` enum
- Register Locaboo 4 configuration in `PredefinedMcpIntegrationRegistryService`
- Display name: "Locaboo 4"
- Description: "Connect to Locaboo 4 booking system for access to bookings, resources, services, and inventory data"
- Authentication type: `OAUTH`
- OAuth endpoint: `{LOCABOO_4_URL}/mcp/oauth/token`
- Default auth header name: "Authorization"

### FR3: Environment Configuration

- Backend must read `LOCABOO_4_URL` environment variable (required)
- This URL determines the Locaboo 4 MCP server endpoint
- Users cannot override this URL in the UI
- If env variable is not set, the predefined integration should not be available

### FR4: OAuth Token Exchange Flow

- User provides Locaboo 3 API token when creating the integration
- System automatically performs OAuth 2.1 client_credentials exchange:
  - POST to `{LOCABOO_4_URL}/mcp/oauth/token`
  - Send Locaboo 3 token as `client_id`
  - Grant type: `client_credentials`
  - Receive JWT Bearer token (valid 14 days)
- Store tokens using new OAuth structure:
  - Original client credentials (Locaboo 3 API token) - encrypted
  - OAuth access token (JWT) - encrypted
  - Token expiration timestamp
  - OAuth endpoint URL

### FR5: Automatic Token Refresh

- Check access token expiration before each MCP operation
- If expired, automatically re-exchange using stored client credentials
- Update stored access token and expiration
- Handle refresh failures gracefully (show error, don't crash)

### FR6: Single Integration Enforcement

- Only one Locaboo 4 integration allowed per organization
- When a Locaboo integration already exists:
  - Hide "LOCABOO" from the predefined integrations list
  - Prevent creation via API with appropriate error message

### FR7: MCP Resources Access

- Support all Locaboo 4 MCP resources:
  - Bookings (with date range filtering)
  - Resources (with name filtering)
  - Services (with name filtering)
  - Inventory (with name filtering)
- Resources return CSV format for lists, JSON for details

### FR8: Error Handling

- If OAuth token refresh fails:
  - Keep integration enabled
  - Show error status in integrations list
  - Return error when agents try to use MCP tools
- Display connection status indicator in integration list

### FR9: UI Integration

- Add Locaboo 4 to predefined integrations dropdown (when not already exists)
- For OAuth-type integrations (including Locaboo):
  - Show credential input field(s) based on integration requirements
  - For Locaboo: Single field labeled "Locaboo 3 API Token"
  - No auth method selection dropdown (OAuth type is predetermined)
- Default name suggestion: "Locaboo"
- Hide URL configuration (managed by backend)
- Hide OAuth endpoint configuration (managed by backend)

## Non-Functional Requirements

### NFR1: Security

- Locaboo 3 API tokens encrypted at rest using AES-256-GCM
- JWT tokens also encrypted at rest
- No tokens logged or exposed in error messages
- Token transmission only over HTTPS (except localhost development)

### NFR2: Performance

- Token exchange should complete within 5 seconds
- JWT validation check should be < 100ms (cached)
- MCP operations maintain existing 30-second timeout

### NFR3: Reliability

- Failed token refresh should not break existing operations
- System should gracefully degrade if Locaboo 4 is unavailable
- Clear error messages for troubleshooting

### NFR4: Maintainability

- Token exchange logic should be reusable for other OAuth integrations
- Clear separation between Locaboo-specific and generic OAuth code

## Acceptance Criteria

### AC1: Authentication Method Refactoring

- [x] McpAuthMethod enum replaced with NO_AUTH/OAUTH approach
- [x] Clean replacement without migration (no existing integrations)
- [x] OAuth integrations store endpoint URL and client credentials
- [x] Access tokens automatically refresh when expired
- [x] UI no longer shows auth method dropdown for new integrations
- [x] Backend correctly handles both auth types

### AC2: Predefined Integration Creation

- [x] Organization admin can see "Locaboo 4" in predefined integrations list
- [x] Can create integration by providing:
  - Custom name (default: "Locaboo")
  - Locaboo 3 API token
- [x] System performs OAuth exchange automatically
- [x] Integration shows as "enabled" when successful
- [x] Integration shows connection status in list

### AC3: Single Integration Limit

- [x] First Locaboo integration creates successfully
- [x] "Locaboo 4" disappears from predefined list after creation
- [x] API returns error if attempting to create second via API
- [x] Existing integration can be deleted to allow new one

### AC4: Token Management

- [x] Client credentials (Locaboo 3 token) stored encrypted
- [x] OAuth access token (JWT) stored encrypted with expiration
- [x] Expired access token automatically refreshed on next use
- [x] Failed refresh shows error in UI but doesn't disable integration

### AC5: Agent Integration

- [x] Agents assigned this integration can access MCP tools
- [x] Can query bookings with date ranges
- [x] Can search resources, services, inventory by name
- [x] Can retrieve detailed records by ID
- [x] Errors shown clearly when integration has issues

### AC6: Environment Configuration

- [x] Backend reads LOCABOO_4_URL from environment
- [x] No URL field shown in UI
- [x] Integration unavailable if env variable not set
- [x] URL cannot be overridden by users

## Out of Scope

- OAuth redirect flow (users must obtain Locaboo 3 tokens separately)
- Multiple Locaboo integrations per organization
- Custom Locaboo server URL configuration in UI
- Proactive JWT refresh (only on-demand)
- Token expiry countdown display
- Email notifications for token issues
- Locaboo 3 token validation beyond OAuth exchange
- Caching of MCP resource responses
- Support for OAuth flows other than client_credentials
- Support for API key authentication (being removed)

## Open Questions

None - all questions have been clarified.

## Clarified Requirements

The following requirements were clarified during requirements review:

### Migration Safety
- **Confirmed**: Zero existing MCP integrations in any environment (dev/staging/prod)
- Clean overwrite of authentication system is completely safe
- No migration code or backwards compatibility needed

### Token Refresh Strategy
- Failed OAuth token refreshes will retry **3 times** with 1-second delays
- After 3 failed attempts, integration is marked as error state
- No exponential backoff - simple fixed retry with fixed delay
- Users can manually trigger refresh through UI after error state

### Environment Configuration
- If `LOCABOO_4_URL` is not set, backend starts normally but Locaboo integration is unavailable
- Integration option is hidden from UI when environment variable is missing
- No default URL fallback - must be explicitly configured
- No failure at startup - graceful feature degradation

### Data Handling
- **No caching** of MCP resource responses - always fetch fresh data
- Expected response sizes are under 1 MB - no pagination needed
- Direct pass-through of responses from Locaboo 4 MCP server

### Security Decisions
- **No validation** of Locaboo 3 API token format before OAuth exchange
- Let OAuth endpoint handle all token validation
- **No logging** of token refresh attempts for maximum security
- Silent operation for all token-related activities

### Response Size Limits
- All MCP resource responses expected to be under 1 MB
- No special handling, streaming, or pagination required
- Standard 30-second timeout is sufficient

## Assumptions

1. Locaboo 4 MCP server is deployed and accessible at the configured URL
2. Locaboo 3 API tokens remain valid for extended periods
3. JWT refresh will succeed if Locaboo 3 token is still valid
4. Organization admins understand how to obtain Locaboo 3 API tokens
5. One Locaboo integration per organization is sufficient
6. Backend environment will always specify LOCABOO_4_URL

## Migration Strategy

### Authentication Method Changes

Since there are no existing MCP integrations in production that use the old auth methods (API_KEY/BEARER_TOKEN), we can safely overwrite the authentication system without migration concerns:

1. **Clean replacement**:
   - Remove `McpAuthMethod` enum entirely
   - Replace with new `auth_type` field supporting NO_AUTH/OAUTH
   - No data migration needed

2. **Database changes**:
   - Can directly modify schema without preserving old data
   - Add new columns: `auth_type`, `oauth_endpoint`, `oauth_client_credentials`, `oauth_access_token`, `oauth_token_expires_at`
   - Remove old `auth_method` and related columns

## Dependencies

### External Dependencies

- Locaboo 4 MCP server must be running and accessible
- Locaboo 3 API must be available for token validation
- Network connectivity between Ayunis and Locaboo systems

### Internal Dependencies

- Existing MCP client infrastructure in Ayunis Core
- Existing credential encryption service
- Existing predefined integration framework
- Organization-scoped authorization system

## Risks

### Risk 1: Token Expiration Handling

- **Risk**: JWT expires while user is actively using the system
- **Impact**: Temporary disruption of MCP operations
- **Mitigation**: Automatic refresh on-demand, clear error messages

### Risk 2: Locaboo 3 Token Revocation

- **Risk**: User's Locaboo 3 token is revoked without their knowledge
- **Impact**: Integration stops working, unclear why
- **Mitigation**: Show connection status, clear error messages

### Risk 3: Network Connectivity

- **Risk**: Network issues between Ayunis and Locaboo
- **Impact**: MCP operations fail intermittently
- **Mitigation**: Appropriate timeouts, retry logic, error handling

### Risk 4: OAuth Specification Changes

- **Risk**: Locaboo 4 changes OAuth implementation
- **Impact**: Token exchange breaks
- **Mitigation**: Abstract OAuth logic for easy updates

## Success Metrics

- Organization admins can configure Locaboo integration in < 2 minutes
- 0 manual token refresh requests (fully automated)
- < 5% token refresh failures due to system issues
- Agents successfully access Locaboo resources in 95%+ of attempts

## Review Sign-off

- [ ] Product Owner
- [ ] Technical Lead
- [ ] Security Review
- [ ] QA Lead

---

_Document Version: 2.2_
_Created: 2024-10-30_
_Last Updated: 2024-10-30_
_Major Changes:_
_- v2.0: Added authentication method refactoring from API_KEY/BEARER_TOKEN to NO_AUTH/OAUTH_
_- v2.1: Clarified that no migration needed - clean overwrite is safe (no existing integrations)_
_- v2.2: Added clarified requirements section with specific decisions on retry strategy, environment handling, caching, and security_
