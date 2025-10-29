# TICKET-015: Implement Validate MCP Integration Use Case

## Description

Implement the use case for validating an MCP integration by testing the connection to the MCP server and checking protocol compatibility. This command attempts to connect to the server and retrieve its capabilities, returning a validation result with success/failure and any error messages.

**Why**: Organization admins need to verify integration configurations are correct and the MCP server is accessible before enabling the integration.

**Technical Approach**:
1. Create command with integration ID
2. Get user's orgId from ContextService
3. Fetch integration from repository
4. Verify integration belongs to user's organization
5. Build connection config from integration (URL, auth, transport)
6. Attempt to connect via MCP client and retrieve capabilities
7. Return validation result (success, error message, capabilities count)

## Acceptance Criteria

- [x] `ValidateMcpIntegrationCommand` created in `src/domain/mcp/application/use-cases/validate-mcp-integration/validate-mcp-integration.command.ts`
- [x] Command fields: `integrationId`
- [x] `ValidateMcpIntegrationUseCase` created in `src/domain/mcp/application/use-cases/validate-mcp-integration/validate-mcp-integration.use-case.ts`
- [x] `ValidationResult` interface defined in use case file with fields: `isValid`, `errorMessage?`, `toolCount?`, `resourceCount?`, `promptCount?`
- [x] Use case injects: `McpIntegrationsRepositoryPort`, `McpClientPort`, `PredefinedMcpIntegrationRegistryService`, `ContextService`
- [x] Use case retrieves `orgId` from `ContextService` and verifies user is authenticated
- [x] Use case fetches integration from repository
- [x] Use case verifies integration belongs to user's organization
- [x] Use case builds connection config (URL, auth headers, transport type)
- [x] Use case attempts to connect and list capabilities via MCP client
- [x] Use case returns `ValidationResult` with success=true and capability counts if connection succeeds
- [x] Use case returns `ValidationResult` with success=false and error message if connection fails
- [x] Use case does NOT throw domain errors for connection failures (returns result)
- [x] Use case throws domain errors for access/auth issues (not found, wrong org)
- [x] Use case has try/catch block that handles connection errors gracefully
- [x] Use case uses Logger to log validation attempts and results
- [x] Unit tests added for:
  - Successfully validates integration with working MCP server
  - Returns failure result when MCP server is unreachable
  - Returns failure result when authentication fails
  - Throws `McpIntegrationNotFoundError` when integration doesn't exist
  - Throws `McpIntegrationAccessDeniedError` when integration belongs to different organization
  - Throws `UnauthorizedException` when user not authenticated
  - Uses organizationId from ContextService (not from command)
  - Logger logs validation attempts and results

## Dependencies

- TICKET-004 (repository and domain entities)
- TICKET-005 (MCP client)
- TICKET-006 (registry service for predefined integrations)
- TICKET-009 (get integration for verification)

## Status

- [x] To Do
- [x] In Progress
- [x] Done

## Complexity

Medium

## Technical Notes

**Files to create**:
- `src/domain/mcp/application/use-cases/validate-mcp-integration/validate-mcp-integration.command.ts`
- `src/domain/mcp/application/use-cases/validate-mcp-integration/validate-mcp-integration.use-case.ts`

**ValidationResult Interface**:
```typescript
export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
  toolCount?: number;
  resourceCount?: number;
  promptCount?: number;
}
```

**Use Case Pattern**:
```typescript
@Injectable()
export class ValidateMcpIntegrationUseCase {
  private readonly logger = new Logger(ValidateMcpIntegrationUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly mcpClient: McpClientPort,
    private readonly registryService: PredefinedMcpIntegrationRegistryService,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: ValidateMcpIntegrationCommand): Promise<ValidationResult> {
    this.logger.log('validateMcpIntegration', { id: command.integrationId });

    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const integration = await this.repository.findById(command.integrationId);
      if (!integration) {
        throw new McpIntegrationNotFoundError(command.integrationId);
      }

      if (integration.organizationId !== orgId) {
        throw new McpIntegrationAccessDeniedError(command.integrationId);
      }

      // Build connection config
      const connectionConfig = this.buildConnectionConfig(integration);

      // Attempt connection and capability discovery
      try {
        const capabilities = await this.mcpClient.listCapabilities(connectionConfig);

        this.logger.log('validationSucceeded', {
          id: command.integrationId,
          toolCount: capabilities.tools.length,
        });

        return {
          isValid: true,
          toolCount: capabilities.tools.length,
          resourceCount: capabilities.resources.length,
          promptCount: capabilities.prompts.length,
        };
      } catch (connectionError) {
        this.logger.warn('validationFailed', {
          id: command.integrationId,
          error: connectionError,
        });

        return {
          isValid: false,
          errorMessage: connectionError.message || 'Connection failed',
        };
      }
    } catch (error) {
      if (error instanceof ApplicationError || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Unexpected error validating integration', { error });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }

  private buildConnectionConfig(integration: McpIntegration): McpConnectionConfig {
    // Implementation depends on TICKET-005
    // Extract URL, auth headers, transport type from integration
  }
}
```

**Testing Approach**:
- Mock repository, MCP client, registry service, context service
- Test success path (valid connection, capabilities returned)
- Test connection failure (server unreachable, returns isValid=false)
- Test auth failure (wrong credentials, returns isValid=false)
- Test error cases (not found, wrong org, no user)
- Verify orgId comes from context service
- Verify connection errors don't throw exceptions (graceful failure)
