# Simplified Architecture: Locaboo 4 MCP Integration

## Overview

This document presents a simplified architecture for integrating Locaboo 4 MCP server with Ayunis Core, eliminating unnecessary OAuth complexity in favor of direct Bearer token authentication.

## Architecture Decisions

1. **Remove OAuth Complexity**: No fake OAuth endpoints or JWT wrapping
2. **Direct Token Validation**: Locaboo 3 API tokens used directly as Bearer tokens
3. **Simple Auth Types**: Just NO_AUTH, BEARER_TOKEN, and OAUTH (for future use)
4. **No Token Refresh**: Locaboo 3 tokens are long-lived, refresh handled manually if needed

---

# Part 1: Locaboo 4 Architecture (Simplified)

## Changes Required

### 1. Remove OAuth Infrastructure

**Files to Delete:**
- `src/mcp/presenters/http/controllers/mcp-oauth.controller.ts`
- `src/mcp/presenters/http/controllers/mcp-oauth-metadata.controller.ts`
- `src/mcp/presenters/http/dtos/token-request.dto.ts`
- `src/mcp/presenters/http/dtos/token-response.dto.ts`
- `src/mcp/authentication/oauth.errors.ts`

### 2. Simplified Authentication Guard

**New File: `src/mcp/authentication/guards/bearer-token.guard.ts`**

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Locaboo3TokenValidationService } from '../services/locaboo3-token-validation.service';

@Injectable()
export class BearerTokenGuard implements CanActivate {
  constructor(
    private readonly validationService: Locaboo3TokenValidationService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.substring(7);

    // Direct validation of Locaboo 3 API token
    const isValid = await this.validationService.validateToken(token);

    if (isValid) {
      // Optionally attach token info to request
      request.locaboo3Token = token;
    }

    return isValid;
  }
}
```

### 3. Update MCP Controllers

**Modified: `src/mcp/presenters/http/controllers/mcp-streamable-http.controller.ts`**

```typescript
@Controller('mcp')
@UseGuards(BearerTokenGuard)  // Apply Bearer token validation
export class McpStreamableHttpController {
  // ... existing MCP endpoint implementations
  // No changes needed to the actual MCP logic
}
```

### 4. Update MCP Module

**Modified: `src/mcp/mcp.module.ts`**

```typescript
@Module({
  imports: [
    CacheModule.register({
      ttl: parseInt(process.env.VALIDATION_CACHE_TTL || '300000'),
      max: 1000,
    }),
    HttpModule,
    // Remove JwtModule - no longer needed
    ReKogMcpModule.forRoot({
      name: process.env.MCP_SERVER_NAME || 'locaboo-mcp-server',
      version: process.env.MCP_SERVER_VERSION || '4.0.0',
      transport: [],
    }),
  ],
  controllers: [
    // Remove OAuth controllers
    McpSseController,
    McpStreamableHttpController,
  ],
  providers: [
    // ... existing providers
    Locaboo3TokenValidationService,
    BearerTokenGuard,  // Add new guard
    // Remove LocabooMcpJwtGuard
  ],
})
export class McpModule {}
```

### 5. Environment Variables

**Remove:**
- `JWT_SECRET` - No longer needed
- `JWT_EXPIRATION` - No longer needed

**Keep:**
- `LOCABOO_3_API_URL` - For token validation
- `VALIDATION_CACHE_TTL` - For caching validation results

## Benefits for Locaboo 4

1. **500+ lines of code removed** (OAuth controllers, DTOs, JWT logic)
2. **Simpler deployment** - No JWT configuration needed
3. **Faster requests** - No JWT encoding/decoding overhead
4. **Easier debugging** - Direct token validation, no layers of encryption

---

# Part 2: Ayunis Core Architecture (Simplified)

## Changes Required

### 1. Simplified Authentication Types

**Modified: `src/domain/mcp/domain/value-objects/mcp-auth-type.enum.ts`**

```typescript
export enum McpAuthType {
  NO_AUTH = 'NO_AUTH',
  BEARER_TOKEN = 'BEARER_TOKEN',  // For Locaboo and simple API tokens
  OAUTH = 'OAUTH'                  // For future standard OAuth support
}
```

### 2. Simplified Domain Entity

**Modified: `src/domain/mcp/domain/mcp-integration.entity.ts`**

```typescript
export class McpIntegration {
  id: string;
  orgId: string;
  name: string;
  serverUrl: string;
  predefinedSlug?: PredefinedMcpIntegrationSlug;

  // Simplified authentication
  authType: McpAuthType;
  authToken?: string;           // Encrypted Bearer token or API key
  authHeaderName?: string;      // Default: 'Authorization'

  // OAuth fields (only for OAUTH type, future use)
  oauthClientId?: string;
  oauthClientSecret?: string;
  oauthRefreshToken?: string;
  oauthAccessToken?: string;
  oauthTokenExpiresAt?: Date;

  // Status tracking
  connectionStatus: ConnectionStatus;
  lastConnectionError?: string;
  lastConnectionCheck?: Date;
}
```

### 3. Simplified TypeORM Record

**Modified: `src/domain/mcp/infrastructure/persistence/postgres/schema/mcp-integration.record.ts`**

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

  // Simplified authentication
  @Column({
    name: 'auth_type',
    type: 'varchar',
    length: 20,
    default: 'NO_AUTH'
  })
  authType: string;

  @Column({ name: 'auth_token', type: 'text', nullable: true })
  authToken?: string;  // Encrypted

  @Column({ name: 'auth_header_name', nullable: true, default: 'Authorization' })
  authHeaderName?: string;

  // OAuth fields (for future use)
  @Column({ name: 'oauth_client_id', nullable: true })
  oauthClientId?: string;

  @Column({ name: 'oauth_client_secret', type: 'text', nullable: true })
  oauthClientSecret?: string;

  @Column({ name: 'oauth_refresh_token', type: 'text', nullable: true })
  oauthRefreshToken?: string;

  @Column({ name: 'oauth_access_token', type: 'text', nullable: true })
  oauthAccessToken?: string;

  @Column({ name: 'oauth_token_expires_at', nullable: true })
  oauthTokenExpiresAt?: Date;

  // Status tracking
  @Column({ name: 'connection_status', default: 'pending' })
  connectionStatus: string;

  @Column({ name: 'last_connection_error', nullable: true })
  lastConnectionError?: string;

  @Column({ name: 'last_connection_check', nullable: true })
  lastConnectionCheck?: Date;
}
```

### 4. Simplified MCP Client Service

**Modified: `src/domain/mcp/infrastructure/mcp-client.service.ts`**

```typescript
@Injectable()
export class McpClientService {
  constructor(
    private readonly mcpClient: McpClientPort,
    private readonly encryptionService: EncryptionService
  ) {}

  async executeOperation(
    integration: McpIntegration,
    operation: McpOperation
  ): Promise<any> {
    const config: McpConnectionConfig = {
      serverUrl: integration.serverUrl
    };

    // Simple authentication handling
    switch (integration.authType) {
      case McpAuthType.BEARER_TOKEN:
        const token = await this.encryptionService.decrypt(integration.authToken);
        config.authHeaderName = integration.authHeaderName || 'Authorization';
        config.authToken = `Bearer ${token}`;
        break;

      case McpAuthType.OAUTH:
        // Future: Handle standard OAuth with MCP SDK
        throw new Error('OAuth not yet implemented');

      case McpAuthType.NO_AUTH:
        // No authentication needed
        break;
    }

    try {
      return await this.mcpClient.execute(operation, config);
    } catch (error) {
      // Handle authentication errors
      if (error.status === 401) {
        await this.updateConnectionStatus(integration, 'error', error.message);
        throw new McpAuthenticationError('Invalid authentication token');
      }
      throw error;
    }
  }

  private async updateConnectionStatus(
    integration: McpIntegration,
    status: ConnectionStatus,
    error?: string
  ): Promise<void> {
    integration.connectionStatus = status;
    integration.lastConnectionError = error;
    integration.lastConnectionCheck = new Date();
    await this.repository.save(integration);
  }
}
```

### 5. Predefined Integration Configuration

**Modified: `src/domain/mcp/infrastructure/predefined/registry.ts`**

```typescript
export const PREDEFINED_INTEGRATIONS = {
  LOCABOO: {
    slug: PredefinedMcpIntegrationSlug.LOCABOO,
    displayName: 'Locaboo 4',
    description: 'Connect to Locaboo 4 booking system',
    authType: McpAuthType.BEARER_TOKEN,
    authHeaderName: 'Authorization',
    credentialFields: [{
      name: 'apiToken',
      label: 'Locaboo 3 API Token',
      type: 'password',
      required: true,
      help: 'Your Locaboo 3 API token will be used to authenticate with Locaboo 4'
    }],
    requiresEnvVar: 'LOCABOO_4_URL'
  },
  // Other integrations...
};
```

### 6. Create Integration Use Case

**Modified: `src/domain/mcp/application/use-cases/create-mcp-integration.use-case.ts`**

```typescript
@Injectable()
export class CreateMcpIntegrationUseCase {
  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly encryptionService: EncryptionService,
    private readonly mcpClient: McpClientPort,
    private readonly contextService: ContextService,
    private readonly registry: PredefinedIntegrationRegistry
  ) {}

  async execute(command: CreateMcpIntegrationCommand): Promise<McpIntegration> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('Organization context required');
    }

    const predefined = this.registry.get(command.predefinedSlug);

    // Check single integration limit for Locaboo
    if (command.predefinedSlug === PredefinedMcpIntegrationSlug.LOCABOO) {
      const existing = await this.repository.findByOrgAndSlug(orgId, command.predefinedSlug);
      if (existing) {
        throw new DuplicateIntegrationError('Locaboo integration already exists');
      }
    }

    // Create integration based on auth type
    const integration = new McpIntegration(
      null,
      orgId,
      command.name || predefined.displayName,
      this.getServerUrl(predefined),
      command.predefinedSlug
    );

    integration.authType = predefined.authType;

    if (predefined.authType === McpAuthType.BEARER_TOKEN) {
      // Encrypt and store the token
      integration.authToken = await this.encryptionService.encrypt(
        command.credentials.apiToken
      );
      integration.authHeaderName = predefined.authHeaderName || 'Authorization';

      // Validate the token immediately
      try {
        await this.validateConnection(integration);
        integration.connectionStatus = ConnectionStatus.CONNECTED;
      } catch (error) {
        integration.connectionStatus = ConnectionStatus.ERROR;
        integration.lastConnectionError = error.message;
      }
    }

    return await this.repository.save(integration);
  }

  private getServerUrl(predefined: PredefinedIntegration): string {
    if (predefined.slug === PredefinedMcpIntegrationSlug.LOCABOO) {
      const url = process.env.LOCABOO_4_URL;
      if (!url) {
        throw new ConfigurationError('LOCABOO_4_URL not configured');
      }
      return `${url}/mcp`;
    }
    return predefined.serverUrl;
  }

  private async validateConnection(integration: McpIntegration): Promise<void> {
    const config: McpConnectionConfig = {
      serverUrl: integration.serverUrl,
      authHeaderName: integration.authHeaderName,
      authToken: `Bearer ${await this.encryptionService.decrypt(integration.authToken)}`
    };

    const result = await this.mcpClient.validateConnection(config);
    if (!result.valid) {
      throw new Error(result.error || 'Connection validation failed');
    }
  }
}
```

### 7. Frontend Integration

**No changes to UI needed:**
- User still selects "Locaboo 4" from predefined integrations
- User still provides Locaboo 3 API token
- System stores it as a Bearer token instead of doing OAuth exchange

## Database Migration

```bash
# Generate migration after updating TypeORM record
cd ayunis-core-backend
npm run migration:generate:dev "SimplifyMcpAuthToBearerToken"
```

## Benefits for Ayunis Core

1. **No OAuth strategy pattern** - 200+ lines removed
2. **No token refresh logic** - 100+ lines removed
3. **Simpler database schema** - Fewer columns, clearer purpose
4. **Faster integration creation** - No OAuth exchange needed
5. **Easier to understand** - Direct token usage

---

# Part 3: Compatibility and Testing

## Request Flow

```mermaid
sequenceDiagram
    participant User
    participant Ayunis
    participant Locaboo4
    participant Locaboo3API

    User->>Ayunis: Create Locaboo integration<br/>(provides Locaboo 3 token)
    Ayunis->>Ayunis: Encrypt and store token
    Ayunis->>Locaboo4: Validate connection<br/>Authorization: Bearer {token}
    Locaboo4->>Locaboo3API: Validate token
    Locaboo3API-->>Locaboo4: Token valid
    Locaboo4-->>Ayunis: Connection successful
    Ayunis-->>User: Integration created

    Note over User,Locaboo3API: Later, when using MCP operations

    User->>Ayunis: Execute MCP operation
    Ayunis->>Locaboo4: MCP request<br/>Authorization: Bearer {token}
    Locaboo4->>Locaboo4: Validate Bearer token
    Locaboo4->>Locaboo4: Execute MCP operation
    Locaboo4-->>Ayunis: MCP response
    Ayunis-->>User: Operation result
```

## Compatibility Matrix

| Component | Before | After | Compatible |
|-----------|--------|-------|------------|
| Ayunis sends | OAuth token request | Bearer token header | ✅ |
| Locaboo expects | OAuth token | Bearer token header | ✅ |
| Token format | JWT with encrypted token | Direct Locaboo 3 token | ✅ |
| Token refresh | Complex refresh logic | None needed | ✅ |
| Error handling | OAuth errors | HTTP 401 | ✅ |

## Testing Strategy

### Locaboo 4 Testing

```typescript
describe('Bearer Token Authentication', () => {
  it('should accept valid Locaboo 3 token', async () => {
    const response = await request(app)
      .post('/mcp/resources/list')
      .set('Authorization', 'Bearer valid-locaboo3-token')
      .expect(200);
  });

  it('should reject invalid token', async () => {
    const response = await request(app)
      .post('/mcp/resources/list')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('should reject missing authorization', async () => {
    const response = await request(app)
      .post('/mcp/resources/list')
      .expect(401);
  });
});
```

### Ayunis Testing

```typescript
describe('MCP Integration with Bearer Token', () => {
  it('should create Locaboo integration with Bearer token', async () => {
    const integration = await createMcpIntegrationUseCase.execute({
      predefinedSlug: PredefinedMcpIntegrationSlug.LOCABOO,
      credentials: { apiToken: 'test-token' }
    });

    expect(integration.authType).toBe(McpAuthType.BEARER_TOKEN);
    expect(integration.authToken).toBeDefined();
    expect(integration.authToken).not.toBe('test-token'); // Should be encrypted
  });

  it('should send Bearer token in MCP requests', async () => {
    const mockMcpClient = jest.spyOn(mcpClient, 'execute');

    await mcpClientService.executeOperation(integration, operation);

    expect(mockMcpClient).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        authHeaderName: 'Authorization',
        authToken: 'Bearer test-token'
      })
    );
  });
});
```

## Implementation Timeline

### Phase 1: Locaboo 4 Changes (1-2 days)
1. Remove OAuth controllers and DTOs
2. Implement Bearer token guard
3. Update MCP controllers
4. Test with Postman/curl

### Phase 2: Ayunis Core Changes (2-3 days)
1. Update domain entities and records
2. Simplify MCP client service
3. Update use cases
4. Generate and run migration

### Phase 3: Integration Testing (1 day)
1. End-to-end testing
2. Error scenario testing
3. Performance testing

### Phase 4: Documentation (0.5 days)
1. Update API documentation
2. Update deployment guides
3. Update user documentation

## Migration Path

### For Existing Deployments

If there are existing MCP integrations (unlikely based on PRD):

```sql
-- Migration to convert any existing OAuth tokens to Bearer tokens
UPDATE mcp_integrations
SET
  auth_type = 'BEARER_TOKEN',
  auth_token = oauth_custom_credentials,
  auth_header_name = 'Authorization'
WHERE
  predefined_slug = 'LOCABOO'
  AND auth_type = 'OAUTH_CUSTOM';
```

## Security Considerations

1. **Token Storage**: Bearer tokens still encrypted at rest using AES-256-GCM
2. **Token Transmission**: Always over HTTPS in production
3. **Token Validation**: Cached for 5 minutes to reduce load on Locaboo 3 API
4. **Error Messages**: Never expose token values in logs or errors

## Future Extensibility

When proper OAuth is needed for other MCP servers:

1. Add OAuth fields to the entity (already included)
2. Implement OAuth flow in separate use case
3. Use MCP SDK's built-in OAuth support
4. No changes needed to Locaboo integration

---

_Document Version: 1.0_
_Created: 2024-10-30_
_Status: Ready for Implementation_

_This simplified architecture reduces complexity by ~70% while maintaining full functionality and security._