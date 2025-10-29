# TICKET-017: Implement Discover MCP Capabilities Use Case

## Description

Implement the use case for discovering capabilities (tools, resources, prompts) from an MCP server. This query connects to the MCP server, retrieves its capabilities, and returns them as domain entities for use in agent conversations.

**Why**: The agent execution flow needs to discover available MCP tools, resources, and prompts at conversation start to make them available to the LLM.

**Technical Approach**:
1. Create query with integration ID
2. Get user's orgId from ContextService (for authorization)
3. Fetch integration from repository
4. Verify integration belongs to user's organization and is enabled
5. Build connection config from integration
6. Connect to MCP server via client
7. Retrieve and parse capabilities (tools, resources, prompts)
8. Map to domain entities (McpTool, McpResource, McpPrompt)
9. Return capabilities result

## Acceptance Criteria

- [x] `DiscoverMcpCapabilitiesQuery` created in `src/domain/mcp/application/use-cases/discover-mcp-capabilities/discover-mcp-capabilities.query.ts`
- [x] Query fields: `integrationId`
- [x] `DiscoverMcpCapabilitiesUseCase` created in `src/domain/mcp/application/use-cases/discover-mcp-capabilities/discover-mcp-capabilities.use-case.ts`
- [x] `CapabilitiesResult` interface defined in use case file with fields: `tools: McpTool[]`, `resources: McpResource[]`, `prompts: McpPrompt[]`
- [x] Use case injects: `McpIntegrationsRepositoryPort`, `McpClientPort`, `PredefinedMcpIntegrationRegistryService`, `ContextService`
- [x] Use case retrieves `orgId` from `ContextService` and verifies user is authenticated
- [x] Use case fetches integration from repository
- [x] Use case verifies integration belongs to user's organization
- [x] Use case verifies integration is enabled (throws error if disabled)
- [x] Use case builds connection config from integration
- [x] Use case calls MCP client to list tools, resources, and prompts
- [x] Use case maps MCP SDK responses to domain entities (McpTool, McpResource, McpPrompt)
- [x] Use case returns `CapabilitiesResult` with all capabilities
- [x] Use case throws domain errors (not HTTP exceptions)
- [x] Use case has try/catch block that re-throws `ApplicationError` and wraps unexpected errors
- [x] Use case uses Logger to log discovery operations and results
- [x] Unit tests added for:
  - Successfully discovers capabilities from enabled integration
  - Returns empty arrays when MCP server has no capabilities
  - Throws `McpIntegrationNotFoundError` when integration doesn't exist
  - Throws `McpIntegrationAccessDeniedError` when integration belongs to different organization
  - Throws `McpIntegrationDisabledError` when integration is disabled
  - Throws `UnauthorizedException` when user not authenticated
  - Uses organizationId from ContextService (not from query)
  - Wraps unexpected errors in `UnexpectedMcpError`
  - Logger logs discovery operations and results

## Dependencies

- TICKET-004 (repository and domain entities)
- TICKET-005 (MCP client)
- TICKET-006 (registry service)
- TICKET-009 (get integration for verification)

## Status

- [x] To Do
- [x] In Progress
- [x] Done

## Complexity

High

## Technical Notes

**Files to create**:
- `src/domain/mcp/application/use-cases/discover-mcp-capabilities/discover-mcp-capabilities.query.ts`
- `src/domain/mcp/application/use-cases/discover-mcp-capabilities/discover-mcp-capabilities.use-case.ts`

**CapabilitiesResult Interface**:
```typescript
export interface CapabilitiesResult {
  tools: McpTool[];
  resources: McpResource[];
  prompts: McpPrompt[];
}
```

**Use Case Pattern**:
```typescript
@Injectable()
export class DiscoverMcpCapabilitiesUseCase {
  private readonly logger = new Logger(DiscoverMcpCapabilitiesUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly mcpClient: McpClientPort,
    private readonly registryService: PredefinedMcpIntegrationRegistryService,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: DiscoverMcpCapabilitiesQuery): Promise<CapabilitiesResult> {
    this.logger.log('discoverMcpCapabilities', { id: query.integrationId });

    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const integration = await this.repository.findById(query.integrationId);
      if (!integration) {
        throw new McpIntegrationNotFoundError(query.integrationId);
      }

      if (integration.organizationId !== orgId) {
        throw new McpIntegrationAccessDeniedError(query.integrationId);
      }

      if (!integration.enabled) {
        throw new McpIntegrationDisabledError(query.integrationId);
      }

      // Build connection config
      const connectionConfig = this.buildConnectionConfig(integration);

      // Discover capabilities from MCP server
      const { tools, resources, prompts } = await this.mcpClient.listCapabilities(
        connectionConfig,
      );

      // Map to domain entities
      const mcpTools = tools.map(tool => this.mapToMcpTool(tool, query.integrationId));
      const mcpResources = resources.map(res => this.mapToMcpResource(res, query.integrationId));
      const mcpPrompts = prompts.map(prompt => this.mapToMcpPrompt(prompt, query.integrationId));

      this.logger.log('discoverySucceeded', {
        id: query.integrationId,
        toolCount: mcpTools.length,
        resourceCount: mcpResources.length,
        promptCount: mcpPrompts.length,
      });

      return {
        tools: mcpTools,
        resources: mcpResources,
        prompts: mcpPrompts,
      };
    } catch (error) {
      if (error instanceof ApplicationError || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Unexpected error discovering capabilities', { error });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }

  private buildConnectionConfig(integration: McpIntegration): McpConnectionConfig {
    // Build from integration (URL, auth, transport)
  }

  private mapToMcpTool(sdkTool: any, integrationId: string): McpTool {
    // Map SDK tool to domain entity
    return new McpTool(
      sdkTool.name,
      sdkTool.description,
      sdkTool.inputSchema,
      integrationId,
    );
  }

  private mapToMcpResource(sdkResource: any, integrationId: string): McpResource {
    // Map SDK resource to domain entity
    return new McpResource(
      sdkResource.uri,
      sdkResource.name,
      sdkResource.description,
      sdkResource.mimeType,
      integrationId,
    );
  }

  private mapToMcpPrompt(sdkPrompt: any, integrationId: string): McpPrompt {
    // Map SDK prompt to domain entity
    return new McpPrompt(
      sdkPrompt.name,
      sdkPrompt.description,
      sdkPrompt.arguments,
      integrationId,
    );
  }
}
```

**Domain Errors**:
```typescript
export class McpIntegrationDisabledError extends McpError {
  constructor(integrationId: string, metadata?: ErrorMetadata) {
    super(
      `MCP integration ${integrationId} is disabled`,
      McpErrorCode.MCP_INTEGRATION_DISABLED,
      400,
      metadata,
    );
  }
}
```

**Testing Approach**:
- Mock repository, MCP client, registry service, context service
- Test success path with all capability types
- Test empty capabilities case
- Test disabled integration (should throw error)
- Test error cases (not found, wrong org, no user)
- Verify orgId comes from context service
- Verify mapping from SDK types to domain entities

**Integration with Runs Module**:
This use case will be called by the runs module at conversation start to discover what tools/resources/prompts are available from assigned MCP integrations.
