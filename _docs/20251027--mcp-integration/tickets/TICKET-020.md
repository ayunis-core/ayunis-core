# TICKET-020: Implement Get MCP Prompt Use Case

## Description

Implement the use case for retrieving a prompt template from an MCP server. This query connects to the MCP server, fetches the specified prompt with arguments, and returns the prompt result containing the template and metadata.

**Why**: During agent conversations, the LLM may need to access predefined prompt templates from MCP servers for structured interactions.

**Technical Approach**:
1. Create query with integration ID, prompt name, and optional arguments
2. Get user's orgId from ContextService (for authorization)
3. Fetch integration from repository
4. Verify integration belongs to user's organization and is enabled
5. Build connection config from integration
6. Connect to MCP server via client
7. Retrieve prompt with arguments
8. Return prompt result (messages, description)

## Acceptance Criteria

- [ ] `GetMcpPromptQuery` created in `src/domain/mcp/application/use-cases/get-mcp-prompt/get-mcp-prompt.query.ts`
- [ ] Query fields: `integrationId`, `promptName`, `arguments?: Record<string, string>`
- [ ] `GetMcpPromptUseCase` created in `src/domain/mcp/application/use-cases/get-mcp-prompt/get-mcp-prompt.use-case.ts`
- [ ] `PromptResult` interface defined in use case file with fields: `messages: PromptMessage[]`, `description?: string`
- [ ] `PromptMessage` interface defined with fields: `role: string`, `content: string`
- [ ] Use case injects: `McpIntegrationsRepositoryPort`, `McpClientPort`, `PredefinedMcpIntegrationRegistryService`, `ContextService`
- [ ] Use case retrieves `orgId` from `ContextService` and verifies user is authenticated
- [ ] Use case fetches integration from repository
- [ ] Use case verifies integration belongs to user's organization
- [ ] Use case verifies integration is enabled
- [ ] Use case builds connection config from integration
- [ ] Use case calls MCP client to retrieve prompt with arguments
- [ ] Use case maps MCP SDK response to `PromptResult`
- [ ] Use case returns `PromptResult` with messages and description
- [ ] Use case throws domain errors (not HTTP exceptions)
- [ ] Use case has try/catch block that re-throws `ApplicationError` and wraps unexpected errors
- [ ] Use case uses Logger to log prompt retrievals and results
- [ ] Unit tests added for:
  - Successfully retrieves prompt with arguments
  - Successfully retrieves prompt without arguments
  - Throws `McpIntegrationNotFoundError` when integration doesn't exist
  - Throws `McpIntegrationAccessDeniedError` when integration belongs to different organization
  - Throws `McpIntegrationDisabledError` when integration is disabled
  - Throws `UnauthorizedException` when user not authenticated
  - Uses organizationId from ContextService (not from query)
  - Wraps unexpected errors in `UnexpectedMcpError`
  - Logger logs prompt retrievals and results

## Dependencies

- TICKET-004 (repository and domain entities)
- TICKET-005 (MCP client)
- TICKET-006 (registry service)
- TICKET-009 (get integration for verification)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Medium

## Technical Notes

**Files to create**:
- `src/domain/mcp/application/use-cases/get-mcp-prompt/get-mcp-prompt.query.ts`
- `src/domain/mcp/application/use-cases/get-mcp-prompt/get-mcp-prompt.use-case.ts`

**PromptResult and PromptMessage Interfaces**:
```typescript
export interface PromptMessage {
  role: string; // 'user', 'assistant', 'system'
  content: string;
}

export interface PromptResult {
  messages: PromptMessage[];
  description?: string;
}
```

**Use Case Pattern**:
```typescript
@Injectable()
export class GetMcpPromptUseCase {
  private readonly logger = new Logger(GetMcpPromptUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly mcpClient: McpClientPort,
    private readonly registryService: PredefinedMcpIntegrationRegistryService,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: GetMcpPromptQuery): Promise<PromptResult> {
    this.logger.log('getMcpPrompt', {
      id: query.integrationId,
      prompt: query.promptName,
    });

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

      // Retrieve prompt from MCP server
      const promptResponse = await this.mcpClient.getPrompt(
        connectionConfig,
        query.promptName,
        query.arguments,
      );

      this.logger.log('promptRetrieved', {
        id: query.integrationId,
        prompt: query.promptName,
        messageCount: promptResponse.messages.length,
      });

      // Map to PromptResult
      return {
        messages: promptResponse.messages.map(msg => ({
          role: msg.role,
          content: msg.content.text || msg.content.toString(),
        })),
        description: promptResponse.description,
      };
    } catch (error) {
      if (error instanceof ApplicationError || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Unexpected error getting prompt', { error });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }

  private buildConnectionConfig(integration: McpIntegration): McpConnectionConfig {
    // Build from integration (URL, auth, transport)
  }
}
```

**Testing Approach**:
- Mock repository, MCP client, registry service, context service
- Test success path with arguments
- Test success path without arguments
- Test disabled integration (throws error)
- Test error cases (not found, wrong org, no user)
- Verify orgId comes from context service
- Verify prompt messages are mapped correctly

**Integration with Runs Module**:
This use case will be called by the runs module when the LLM needs to access a prompt template from an MCP server during conversation. The prompt messages can be injected into the conversation context.

**Prompt Arguments**:
MCP prompts can accept arguments for template substitution (e.g., a prompt template might have placeholders that are filled with argument values). The arguments from the query are passed to the MCP server.
