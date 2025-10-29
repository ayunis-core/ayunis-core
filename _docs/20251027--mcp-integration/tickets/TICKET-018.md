# TICKET-018: Implement Execute MCP Tool Use Case

## Description

Implement the use case for executing a tool on an MCP server. This command connects to the MCP server, calls the specified tool with provided parameters, and returns the execution result to the agent/LLM. Errors from the MCP server are returned to the LLM for intelligent handling.

**Why**: During agent conversations, when the LLM decides to use an MCP tool, the runs module needs to execute it and get results back to continue the conversation.

**Technical Approach**:
1. Create command with integration ID, tool name, and parameters
2. Get user's orgId from ContextService (for authorization)
3. Fetch integration from repository
4. Verify integration belongs to user's organization and is enabled
5. Build connection config from integration
6. Connect to MCP server via client
7. Execute tool with parameters
8. Return execution result (content, error if any)

## Acceptance Criteria

- [x] `ExecuteMcpToolCommand` created in `src/domain/mcp/application/use-cases/execute-mcp-tool/execute-mcp-tool.command.ts`
- [x] Command fields: `integrationId`, `toolName`, `parameters: Record<string, unknown>`
- [x] `ExecuteMcpToolUseCase` created in `src/domain/mcp/application/use-cases/execute-mcp-tool/execute-mcp-tool.use-case.ts`
- [x] `ToolExecutionResult` interface defined in use case file with fields: `isError: boolean`, `content: any`, `errorMessage?: string`
- [x] Use case injects: `McpIntegrationsRepositoryPort`, `McpClientPort`, `PredefinedMcpIntegrationRegistryService`, `ContextService`
- [x] Use case retrieves `orgId` from `ContextService` and verifies user is authenticated
- [x] Use case fetches integration from repository
- [x] Use case verifies integration belongs to user's organization
- [x] Use case verifies integration is enabled
- [x] Use case builds connection config from integration
- [x] Use case calls MCP client to execute tool with parameters
- [x] Use case returns `ToolExecutionResult` with success content
- [x] Use case returns `ToolExecutionResult` with error details if tool execution fails (does NOT throw)
- [x] Use case throws domain errors for access/auth issues (not found, wrong org, disabled)
- [x] Use case has try/catch block that handles tool execution errors gracefully (return error result)
- [x] Use case uses Logger to log tool executions and results
- [x] Unit tests added for:
  - Successfully executes tool and returns result
  - Returns error result when tool execution fails on MCP server
  - Returns error result when tool doesn't exist on MCP server
  - Throws `McpIntegrationNotFoundError` when integration doesn't exist
  - Throws `McpIntegrationAccessDeniedError` when integration belongs to different organization
  - Throws `McpIntegrationDisabledError` when integration is disabled
  - Throws `UnauthorizedException` when user not authenticated
  - Uses organizationId from ContextService (not from command)
  - Wraps unexpected errors in `UnexpectedMcpError`
  - Logger logs tool executions and results

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

Medium

## Technical Notes

**Files to create**:
- `src/domain/mcp/application/use-cases/execute-mcp-tool/execute-mcp-tool.command.ts`
- `src/domain/mcp/application/use-cases/execute-mcp-tool/execute-mcp-tool.use-case.ts`

**ToolExecutionResult Interface**:
```typescript
export interface ToolExecutionResult {
  isError: boolean;
  content: any; // Tool response content (structure depends on tool)
  errorMessage?: string; // Error message if execution failed
}
```

**Use Case Pattern**:
```typescript
@Injectable()
export class ExecuteMcpToolUseCase {
  private readonly logger = new Logger(ExecuteMcpToolUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly mcpClient: McpClientPort,
    private readonly registryService: PredefinedMcpIntegrationRegistryService,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: ExecuteMcpToolCommand): Promise<ToolExecutionResult> {
    this.logger.log('executeMcpTool', {
      id: command.integrationId,
      tool: command.toolName,
    });

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

      if (!integration.enabled) {
        throw new McpIntegrationDisabledError(command.integrationId);
      }

      // Build connection config
      const connectionConfig = this.buildConnectionConfig(integration);

      // Execute tool (errors are caught and returned, not thrown)
      try {
        const result = await this.mcpClient.executeTool(
          connectionConfig,
          command.toolName,
          command.parameters,
        );

        this.logger.log('toolExecutionSucceeded', {
          id: command.integrationId,
          tool: command.toolName,
        });

        return {
          isError: false,
          content: result,
        };
      } catch (toolError) {
        this.logger.warn('toolExecutionFailed', {
          id: command.integrationId,
          tool: command.toolName,
          error: toolError,
        });

        // Return error to LLM (don't throw)
        return {
          isError: true,
          content: null,
          errorMessage: toolError.message || 'Tool execution failed',
        };
      }
    } catch (error) {
      if (error instanceof ApplicationError || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Unexpected error executing tool', { error });
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
- Test success path (tool executes, returns result)
- Test tool execution error (returns error result, doesn't throw)
- Test tool not found (returns error result)
- Test disabled integration (throws error)
- Test error cases (not found, wrong org, no user)
- Verify orgId comes from context service
- Verify tool errors are returned gracefully (not thrown)

**Integration with Runs Module**:
This use case will be called by the runs module when the LLM decides to use an MCP tool during conversation. The result is returned to the LLM in the next message.

**Error Transparency Philosophy**:
Tool execution errors are returned to the LLM (not thrown as exceptions) to allow intelligent error handling and user communication.
