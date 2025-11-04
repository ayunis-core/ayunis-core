# Technical Architecture Specification: Locaboo 4 MCP Integration

## Executive Summary

This specification defines the technical architecture for integrating Locaboo 4 as a predefined MCP (Model Context Protocol) server in Ayunis Core. The integration introduces a hybrid OAuth architecture that supports Locaboo's custom authentication flow while maintaining standard OAuth 2.1 compliance for other MCP integrations.

### Key Architectural Decisions

1. **Hybrid Authentication System**: Three-tier authentication system (NO_AUTH/OAUTH_STANDARD/OAUTH_CUSTOM) replacing the existing API_KEY/BEARER_TOKEN approach
2. **Strategy Pattern for OAuth**: Separate OAuth strategies for Locaboo's custom flow vs standard OAuth 2.1 implementations
3. **MCP SDK Integration**: Leverage SDK's built-in OAuth for standard integrations while using custom handling for Locaboo
4. **Predefined Integration Pattern**: Extension of existing predefined integration framework for Locaboo 4
5. **Environment-Based Configuration**: Server URL configuration via environment variable, not user-configurable
6. **Future-Proof Design**: Easy migration path when Locaboo implements standard OAuth

## System Context

### Affected Components

- **MCP Module** (`src/domain/mcp/`): Core changes to authentication system
- **Predefined Integration Registry**: Addition of Locaboo configuration
- **Database Schema**: Modified MCP integration tables
- **Frontend Integration Forms**: Updated to support OAuth flow
- **Environment Configuration**: New required environment variable

### External Dependencies

- Locaboo 4 MCP Server (OAuth endpoint and MCP resources)
- Locaboo 3 API (for token validation during OAuth exchange)

### Integration Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
│   Ayunis Core   │────▶│  OAuth Exchange  │────▶│   Locaboo 4    │
│    Frontend     │     │     Service      │     │  MCP Server    │
└─────────────────┘     └──────────────────┘     └────────────────┘
         │                       │                         │
         │                       ▼                         │
         │              ┌──────────────────┐              │
         └─────────────▶│  MCP Integration  │◀─────────────┘
                        │     Service       │
                        └──────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │    PostgreSQL     │
                        │   (Credentials)   │
                        └──────────────────┘
```

## Module Architecture

### 1. Modified Modules

#### MCP Module (`src/domain/mcp/`)

**Domain Layer Changes:**
- `mcp-integration.entity.ts`: Replace auth fields with hybrid OAuth structure
  - Remove: `authMethod`, `apiKey`, `bearerToken`
  - Add: `authType` (enum: NO_AUTH, OAUTH_STANDARD, OAUTH_CUSTOM)
  - For OAUTH_CUSTOM (Locaboo):
    - `oauthCustomCredentials` (encrypted JSON - stores Locaboo 3 API token)
    - `oauthCustomToken` (encrypted string)
    - `oauthCustomExpiresAt` (timestamp)
  - For OAUTH_STANDARD (SDK-managed):
    - `oauthClientId` (string)
    - `oauthClientSecret` (encrypted string)
    - `oauthRefreshToken` (encrypted string)
    - `oauthAccessToken` (encrypted string)
    - `oauthTokenExpiresAt` (timestamp)

**Application Layer Changes:**
- New use cases:
  - `RefreshOauthTokenUseCase`: Handle token refresh for both standard and custom OAuth
  - `ValidateOauthTokenUseCase`: Check token expiration
  - `InitiateStandardOauthFlowUseCase`: Start standard OAuth authorization
- Modified use cases:
  - `CreateMcpIntegrationUseCase`: Route to appropriate OAuth strategy
  - `ExecuteMcpOperationUseCase`: Handle auth based on type
- New ports:
  - `OauthStrategyPort`: Interface for OAuth strategies
- New DTOs:
  - `OauthCredentialsDto`: Client credentials structure
  - `OauthTokenResponseDto`: OAuth token exchange response

**Infrastructure Layer Changes:**
- `mcp-integrations.repository.ts`: Update for new schema
- New service: `OauthTokenService` for token exchange/refresh
- Modified: `McpClientService` to use OAuth tokens

#### Predefined Integration Registry (`src/domain/mcp/infrastructure/predefined/`)

**New Configuration:**
```typescript
{
  slug: PredefinedMcpIntegrationSlug.LOCABOO,
  displayName: 'Locaboo 4',
  description: 'Connect to Locaboo 4 booking system...',
  authType: McpAuthType.OAUTH_CUSTOM,  // Custom OAuth for Locaboo
  oauthEndpoint: '${LOCABOO_4_URL}/mcp/oauth/token',
  credentialFields: [{
    name: 'apiToken',
    label: 'Locaboo 3 API Token',
    type: 'password',
    required: true
  }]
}

// Example of standard OAuth integration
{
  slug: PredefinedMcpIntegrationSlug.GITHUB,
  displayName: 'GitHub MCP Server',
  description: 'Connect to GitHub via MCP',
  authType: McpAuthType.OAUTH_STANDARD,  // Standard OAuth 2.1
  oauthConfig: {
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scope: 'repo read:user'
  }
}
```

### 2. New Components

#### OAuth Strategy System (`src/domain/mcp/infrastructure/oauth/`)

```typescript
oauth/
├── oauth-strategy.factory.ts    # Strategy factory
├── oauth-strategy.interface.ts  # Strategy interface
├── strategies/
│   ├── locaboo-oauth.strategy.ts     # Locaboo custom OAuth
│   ├── standard-oauth.strategy.ts    # MCP SDK standard OAuth
│   └── base-oauth.strategy.ts        # Shared logic
├── providers/
│   └── sdk-oauth-provider.adapter.ts # MCP SDK OAuthClientProvider impl
└── token-storage/
    └── database-token-storage.ts     # Token persistence
```

**OAuth Strategy Interface:**
```typescript
interface OAuthStrategy {
  exchangeCredentials(credentials: any): Promise<OAuthTokens>;
  refreshToken(tokenData: any): Promise<OAuthTokens>;
  validateToken(token: string): Promise<boolean>;
  requiresUserInteraction(): boolean;
}
```

**Locaboo OAuth Strategy:**
- Custom client_credentials flow using Locaboo 3 API token
- Direct token exchange without user interaction
- Token refresh via re-exchange (no refresh tokens)
- 3 retry attempts with 1-second delays

**Standard OAuth Strategy:**
- Leverages MCP SDK's `OAuthClientProvider`
- Supports authorization code flow with PKCE
- Dynamic client registration
- Automatic token refresh using refresh tokens

#### OAuth Token Refresh Interceptor

- Implements automatic token refresh before MCP operations
- Integrates with existing MCP client service
- Handles refresh failures gracefully

### 3. Database Schema Changes

#### Modified TypeORM Record: `mcp-integration.record.ts`

```typescript
@Entity('mcp_integrations')
export class McpIntegrationRecord extends BaseRecord {
  @Column({ name: 'org_id' })
  orgId: string;

  @Column()
  name: string;

  @Column({ name: 'server_url' })
  serverUrl: string;

  @Column({ name: 'predefined_slug', nullable: true })
  predefinedSlug?: string;

  // Authentication type
  @Column({
    name: 'auth_type',
    type: 'varchar',
    length: 20,
    default: 'NO_AUTH'
  })
  authType: string; // 'NO_AUTH' | 'OAUTH_STANDARD' | 'OAUTH_CUSTOM'

  // For OAUTH_CUSTOM (Locaboo)
  @Column({ name: 'oauth_custom_endpoint', nullable: true, length: 500 })
  oauthCustomEndpoint?: string;

  @Column({ name: 'oauth_custom_credentials', type: 'text', nullable: true })
  oauthCustomCredentials?: string; // Encrypted JSON

  @Column({ name: 'oauth_custom_token', type: 'text', nullable: true })
  oauthCustomToken?: string; // Encrypted

  @Column({ name: 'oauth_custom_expires_at', nullable: true })
  oauthCustomExpiresAt?: Date;

  // For OAUTH_STANDARD (SDK-managed)
  @Column({ name: 'oauth_client_id', nullable: true })
  oauthClientId?: string;

  @Column({ name: 'oauth_client_secret', type: 'text', nullable: true })
  oauthClientSecret?: string; // Encrypted

  @Column({ name: 'oauth_refresh_token', type: 'text', nullable: true })
  oauthRefreshToken?: string; // Encrypted

  @Column({ name: 'oauth_access_token', type: 'text', nullable: true })
  oauthAccessToken?: string; // Encrypted

  @Column({ name: 'oauth_token_expires_at', nullable: true })
  oauthTokenExpiresAt?: Date;

  @Column({ name: 'oauth_metadata', type: 'jsonb', nullable: true })
  oauthMetadata?: any; // OAuth server metadata

  // Status tracking
  @Column({ name: 'connection_status', default: 'pending' })
  connectionStatus: string;

  @Column({ name: 'last_connection_error', nullable: true })
  lastConnectionError?: string;

  @Column({ name: 'last_connection_check', nullable: true })
  lastConnectionCheck?: Date;

  // Indexes will be added via TypeORM decorators
  @Index('idx_oauth_custom_expiry')
  @Index('idx_oauth_standard_expiry')
}
```

**Migration Generation:**
After updating the TypeORM record, generate migration with:
```bash
npm run migration:generate:dev "RefactorMcpAuthToHybridOAuth"
```

## Integration Specifications

### OAuth Token Exchange API Contract

**Request:**
```http
POST {LOCABOO_4_URL}/mcp/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id={locaboo_3_api_token}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 1209600
}
```

### MCP SDK OAuth Integration

The MCP SDK (`@modelcontextprotocol/sdk`) provides built-in OAuth support through its client authentication interfaces. However, for the Locaboo 4 integration, we need a custom approach:

1. **SDK OAuth Capabilities**: The SDK includes `OAuthClientProvider` interface and authentication methods like `addClientAuthentication` for custom OAuth flows
2. **Custom Client Credentials Flow**: Since Locaboo 4 uses a non-standard OAuth flow (Locaboo 3 API token as client_id), we'll implement a custom OAuth service
3. **Token Injection**: We'll pass the OAuth token to the SDK's `StreamableHTTPClientTransport` via headers

### MCP Client Authentication Flow

```typescript
class McpClientService {
  async executeOperation(
    integration: McpIntegration,
    operation: McpOperation
  ): Promise<any> {
    switch (integration.authType) {
      case McpAuthType.NO_AUTH:
        return this.executeNoAuth(integration, operation);

      case McpAuthType.OAUTH_CUSTOM:
        // Locaboo custom OAuth
        if (this.isTokenExpired(integration.oauthCustomExpiresAt)) {
          const strategy = this.strategyFactory.create(integration);
          const tokens = await strategy.refreshToken(integration);
          await this.saveCustomTokens(integration, tokens);
        }
        const config = {
          serverUrl: integration.serverUrl,
          authHeaderName: 'Authorization',
          authToken: `Bearer ${integration.oauthCustomToken}`
        };
        return await this.mcpClient.execute(operation, config);

      case McpAuthType.OAUTH_STANDARD:
        // Use MCP SDK's built-in OAuth
        const provider = new DatabaseOAuthProvider(integration);
        const transport = new StreamableHTTPClientTransport(
          integration.serverUrl,
          { oauthProvider: provider }
        );
        // SDK handles token refresh automatically
        return await this.executeWithTransport(transport, operation);
    }
  }
}
```

### Frontend Integration Flow

1. User selects "Locaboo 4" from predefined integrations
2. Frontend displays single credential field (Locaboo 3 API Token)
3. On submit, backend:
   - Creates integration record
   - Performs OAuth exchange
   - Stores tokens encrypted
   - Returns success/failure

## Entry Points

### HTTP API Endpoints (Modified)

**POST /api/mcp-integrations/predefined**
- Modified to handle OAuth authentication type
- Triggers OAuth exchange for OAUTH-type integrations
- Returns integration with connection status

**GET /api/mcp-integrations**
- Modified response to include OAuth status fields
- Shows token expiration status

### Background Processes

**Token Refresh Process:**
- Triggered on-demand before MCP operations
- Not scheduled/proactive
- Logs refresh attempts for debugging (not token values)

### Environment Configuration

**New Required Variable:**
```bash
LOCABOO_4_URL=https://locaboo4.example.com
```

**Configuration Service Changes:**
```typescript
@Injectable()
export class McpConfigService {
  get locaboo4Url(): string | undefined {
    return process.env.LOCABOO_4_URL;
  }

  isPredefinedIntegrationAvailable(slug: string): boolean {
    if (slug === PredefinedMcpIntegrationSlug.LOCABOO) {
      return !!this.locaboo4Url;
    }
    return true;
  }
}
```

## Data Architecture

### Data Models

**McpIntegration Entity (Modified):**
```typescript
export class McpIntegration {
  id: string;
  orgId: string;
  name: string;
  serverUrl: string;
  predefinedSlug?: PredefinedMcpIntegrationSlug;

  // Authentication type
  authType: McpAuthType; // NO_AUTH | OAUTH_STANDARD | OAUTH_CUSTOM

  // For OAUTH_CUSTOM (Locaboo)
  oauthCustomEndpoint?: string;
  oauthCustomCredentials?: EncryptedJson;  // Stores Locaboo 3 API token
  oauthCustomToken?: EncryptedString;
  oauthCustomExpiresAt?: Date;

  // For OAUTH_STANDARD (MCP SDK managed)
  oauthClientId?: string;
  oauthClientSecret?: EncryptedString;
  oauthRefreshToken?: EncryptedString;
  oauthAccessToken?: EncryptedString;
  oauthTokenExpiresAt?: Date;
  oauthMetadata?: OAuthServerMetadata;  // Cached auth server metadata

  // Status tracking
  connectionStatus: ConnectionStatus;
  lastConnectionError?: string;
  lastConnectionCheck?: Date;
}
```

**OAuth Credential Structure:**
```typescript
interface LocabooOauthCredentials {
  apiToken: string;  // Locaboo 3 API token
}
```

### Encryption Strategy

- Use existing `EncryptionService` (AES-256-GCM)
- Encrypt at application layer before database storage
- Fields to encrypt:
  - `oauthClientCredentials`
  - `oauthAccessToken`

### Migration Strategy

**TypeORM Auto-Generated Migration:**
1. Update `McpIntegrationRecord` class with new columns
2. Remove old auth columns from the record
3. Generate migration automatically:
   ```bash
   cd ayunis-core-backend
   npm run migration:generate:dev "RefactorMcpAuthToHybridOAuth"
   ```
4. Review generated migration before running
5. Run migration:
   ```bash
   npm run migration:run:dev
   ```

Since there are no existing MCP integrations in production, this is a safe clean replacement.

## Cross-Cutting Concerns

### Security

**Token Storage:**
- All tokens encrypted at rest using AES-256-GCM
- Encryption key from environment variable
- No tokens in logs or error messages

**Network Security:**
- HTTPS required for production
- Certificate validation enabled
- Timeout on OAuth requests (5 seconds)

### Performance

**Token Refresh Optimization:**
- Check expiration in-memory first (no DB hit)
- Cache decrypted tokens for request duration
- Parallel refresh attempts prevented via mutex

**Database Performance:**
- Index on `oauth_token_expires_at` for quick expiry checks
- Minimal columns updated during refresh

### Error Handling

**OAuth Exchange Failures:**
```typescript
enum OauthErrorCode {
  INVALID_CREDENTIALS = 'OAUTH_INVALID_CREDENTIALS',
  EXCHANGE_FAILED = 'OAUTH_EXCHANGE_FAILED',
  NETWORK_ERROR = 'OAUTH_NETWORK_ERROR',
  REFRESH_FAILED = 'OAUTH_REFRESH_FAILED'
}
```

**User-Facing Error Messages:**
- "Invalid Locaboo 3 API token provided"
- "Unable to connect to Locaboo 4 server"
- "Token refresh failed - please check credentials"

### Monitoring and Observability

**Metrics to Track:**
- OAuth exchange success/failure rate
- Token refresh frequency and success rate
- Average token lifetime before refresh
- MCP operation failures due to auth issues

**Logging:**
- Log OAuth exchange attempts (without tokens)
- Log refresh attempts and outcomes
- Log connection status changes

## Risks and Trade-offs

### Identified Risks

1. **Token Expiration During Long Operations**
   - Risk: 14-day JWT expires mid-operation
   - Mitigation: Check/refresh before each operation
   - Trade-off: Additional latency on operations

2. **Locaboo 3 Token Revocation**
   - Risk: User's token revoked without notification
   - Mitigation: Clear error messages, status indicators
   - Trade-off: No proactive validation

3. **OAuth Endpoint Changes**
   - Risk: Locaboo 4 modifies OAuth implementation
   - Mitigation: Abstracted OAuth service for easy updates
   - Trade-off: Complexity of abstraction layer

### Architectural Trade-offs

1. **Hybrid OAuth Architecture**
   - Decision: Support both custom (Locaboo) and standard OAuth flows
   - Justification: Allows Locaboo integration without forcing non-standard OAuth on others
   - Trade-off: Additional complexity in OAuth handling
   - Alternative: Force all integrations to use custom OAuth

2. **Strategy Pattern for OAuth**
   - Decision: Use strategy pattern to separate OAuth implementations
   - Justification: Clean separation, easy to remove Locaboo custom code later
   - Trade-off: More classes and abstractions
   - Alternative: Single OAuth service with conditional logic

3. **On-Demand vs Proactive Refresh**
   - Decision: Refresh only when needed for custom OAuth, SDK manages for standard
   - Justification: Simpler for custom, leverage SDK capabilities for standard
   - Alternative: Uniform background refresh job for all

4. **Single Locaboo Integration Limit**
   - Decision: One Locaboo integration per organization
   - Justification: Simplifies management, matches use case
   - Alternative: Multiple integrations with complexity

5. **Separate Database Fields**
   - Decision: Separate columns for custom vs standard OAuth
   - Justification: Clear data model, type safety, easier migration
   - Trade-off: More nullable columns
   - Alternative: Single JSONB column for all OAuth data

## Implementation Guidance

### Phase 1: Foundation (Backend OAuth Strategy System)

1. **Create OAuth strategy system:**
   - Define `OAuthStrategy` interface
   - Implement `LocabooOAuthStrategy` for custom flow
   - Implement `StandardOAuthStrategy` using MCP SDK
   - Create `OAuthStrategyFactory`

2. **Update domain entities:**
   - Modify `McpIntegration` entity with hybrid auth fields
   - Update `McpIntegrationRecord` TypeORM entity
   - Generate and run migration

3. **Update repositories and mappers:**
   - Update `McpIntegrationsRepository`
   - Modify mappers for new auth fields

### Phase 2: OAuth Implementation

1. **Locaboo custom OAuth:**
   - Implement token exchange with Locaboo 4
   - Add retry logic (3 attempts, 1-second delay)
   - Handle token refresh via re-exchange

2. **Standard OAuth integration:**
   - Create `DatabaseOAuthProvider` implementing SDK's `OAuthClientProvider`
   - Implement token storage using database
   - Handle authorization code flow for standard integrations

3. **Update MCP client service:**
   - Modify to handle three auth types
   - Integrate strategy pattern
   - Ensure proper token refresh before operations

### Phase 3: Use Case Updates

1. **Create integration use case:**
   - Route to appropriate strategy based on auth type
   - Handle Locaboo special case
   - Support standard OAuth flow initiation

2. **Execute operation use case:**
   - Check auth type and refresh tokens accordingly
   - Use SDK transport for standard OAuth
   - Use custom headers for Locaboo

3. **Add Locaboo to registry:**
   - Configure as `OAUTH_CUSTOM` type
   - Set environment-based URL
   - Define credential fields

### Phase 4: Frontend Updates

1. **Integration creation UI:**
   - Show appropriate fields based on auth type
   - No auth method dropdown (determined by predefined config)
   - Handle OAuth redirect for standard flow

2. **Connection status:**
   - Display token expiration status
   - Show connection errors
   - Allow manual token refresh

3. **API client regeneration:**
   - Update DTOs for new auth fields
   - Generate TypeScript client

### Phase 5: Testing and Validation

1. **Unit tests:**
   - Test each OAuth strategy independently
   - Mock HTTP calls for Locaboo
   - Test factory pattern

2. **Integration tests:**
   - Test complete OAuth flows
   - Verify token refresh logic
   - Test strategy selection

3. **E2E tests:**
   - Create Locaboo integration via UI
   - Execute MCP operations
   - Verify token refresh on expiration

4. **Manual testing:**
   - Test with real Locaboo 4 instance
   - Verify standard OAuth with test MCP server
   - Ensure backward compatibility for NO_AUTH

### Critical Path Items

1. Database migration must be tested thoroughly
2. Encryption service must be properly configured
3. LOCABOO_4_URL environment variable must be set
4. OAuth token service must handle all edge cases

### Testing Strategy

**Unit Tests:**
- OAuth token service (mock HTTP client)
- Token refresh logic (various expiration scenarios)
- Encryption/decryption of credentials

**Integration Tests:**
- Complete OAuth exchange flow
- Token refresh with retry logic
- MCP operations with expired tokens

**E2E Tests:**
- Create Locaboo integration via UI
- Execute MCP operations
- Handle token expiration

### Rollout Considerations

1. **Environment Preparation:**
   - Set LOCABOO_4_URL in all environments
   - Verify network connectivity to Locaboo 4

2. **Deployment Sequence:**
   - Deploy backend with new OAuth system
   - Run database migration
   - Deploy frontend updates
   - Verify with test organization

3. **Rollback Plan:**
   - Migration includes down() method
   - Feature flag for OAuth system if needed
   - Keep old auth code until stable

## Migration Path to Standard OAuth

When Locaboo 4 eventually implements standard OAuth 2.1:

### Phase 1: Locaboo 4 Implementation
Locaboo 4 needs to implement:
- OAuth 2.0 Protected Resource Metadata endpoint (`/.well-known/oauth-protected-resource`)
- OAuth 2.0 Authorization Server Metadata endpoint (`/.well-known/oauth-authorization-server`)
- Standard client_credentials grant with proper client_id/client_secret
- Resource indicators (RFC 8707) support

### Phase 2: Ayunis Migration
1. **Update registry:**
   ```typescript
   // Change from:
   authType: McpAuthType.OAUTH_CUSTOM
   // To:
   authType: McpAuthType.OAUTH_STANDARD
   ```

2. **Migrate existing integrations:**
   - Create migration to move data from `oauth_custom_*` to `oauth_*` columns
   - Issue new client credentials through Locaboo's standard OAuth
   - Update tokens using standard refresh flow

3. **Remove custom code:**
   - Delete `LocabooOAuthStrategy` class
   - Remove `OAUTH_CUSTOM` enum value (once no integrations use it)
   - Clean up custom OAuth columns from database

4. **Simplify architecture:**
   - All OAuth integrations use MCP SDK's built-in support
   - Single OAuth flow for all integrations
   - Reduced code complexity

### Benefits After Migration
- Locaboo becomes compatible with any MCP-compliant client
- No special handling needed in Ayunis
- Better security through standard OAuth flows
- Easier maintenance and updates

## MCP SDK Integration Details

### Current SDK Usage

The existing implementation uses the `@modelcontextprotocol/sdk` (v1.20.2) with a simple authentication approach:

- **Client Adapter**: `McpSdkClientAdapter` creates clients using `StreamableHTTPClientTransport`
- **Authentication**: Passed via headers in the transport configuration
- **Connection Strategy**: On-demand connections (create, execute, close)

### OAuth Integration Approach

While the MCP SDK provides comprehensive OAuth client support via `OAuthClientProvider`, we'll use a hybrid approach for Locaboo 4:

1. **Custom OAuth Service**: Handle the non-standard Locaboo 3 → Locaboo 4 token exchange
2. **SDK Integration**: Pass resulting Bearer tokens to the SDK's existing authentication mechanism
3. **Token Management**: Store and refresh tokens at the application layer, not SDK layer

This approach allows us to:
- Support Locaboo's specific OAuth flow (using Locaboo 3 API token as client_id)
- Maintain compatibility with the existing MCP client implementation
- Keep OAuth logic centralized and testable
- Avoid complex SDK OAuth provider implementations for this specific use case

### Future Considerations

For standard OAuth 2.1 implementations, the SDK's built-in `OAuthClientProvider` could be used directly:
- Dynamic client registration support
- Standard authorization code flow
- Built-in token storage interfaces
- Automatic token refresh

However, Locaboo 4's custom client credentials flow (using legacy API tokens) requires our custom implementation.

## Appendix: File Structure

```
src/domain/mcp/
├── domain/
│   ├── mcp-integration.entity.ts (MODIFIED)
│   └── value-objects/
│       └── mcp-auth-type.enum.ts (NEW)
├── application/
│   ├── use-cases/
│   │   ├── create-mcp-integration.use-case.ts (MODIFIED)
│   │   ├── refresh-oauth-token.use-case.ts (NEW)
│   │   └── validate-oauth-token.use-case.ts (NEW)
│   ├── dtos/
│   │   ├── oauth-credentials.dto.ts (NEW)
│   │   └── oauth-token-response.dto.ts (NEW)
│   └── ports/
│       └── oauth-service.port.ts (NEW)
├── infrastructure/
│   ├── persistence/
│   │   └── postgres/
│   │       ├── schema/
│   │       │   └── mcp-integration.record.ts (MODIFIED)
│   │       └── mcp-integrations.repository.ts (MODIFIED)
│   ├── predefined/
│   │   └── predefined-registry.service.ts (MODIFIED)
│   ├── oauth/ (NEW)
│   │   ├── oauth-token.service.ts
│   │   ├── oauth-token.interface.ts
│   │   └── strategies/
│   │       └── client-credentials.strategy.ts
│   └── mcp-client.service.ts (MODIFIED)
└── mcp.module.ts (MODIFIED)
```

---

_Document Version: 2.0_
_Created: 2024-10-30_
_Last Updated: 2024-10-30_
_Status: Ready for Review_

_Major Changes:_
_- v2.0: Redesigned to use hybrid OAuth architecture supporting both Locaboo's custom flow and standard OAuth 2.1_
_- v2.0: Added strategy pattern for OAuth implementations_
_- v2.0: Included migration path for future standard OAuth compliance_
_- v2.0: Updated to use TypeORM records instead of raw SQL migrations_