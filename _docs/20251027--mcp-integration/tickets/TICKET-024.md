# TICKET-024: Implement List Agent MCP Integrations Use Case

## Description

Implement the use case that retrieves all MCP integrations currently assigned to a specific agent. This returns full integration entities (not just IDs) so the UI can display integration details like name, type, and enabled status.

**Why**: The UI needs to display which MCP integrations are currently assigned to an agent. Users need to see integration details (name, type, enabled status) to understand what capabilities the agent has access to.

**Technical Approach**:
1. Create `ListAgentMcpIntegrationsQuery` with `agentId`
2. Create use case that:
   - Gets `userId` from `ContextService`
   - Validates agent exists and user owns it
   - Retrieves agent's mcpIntegrationIds
   - Fetches full integration entities for those IDs
   - Returns array of McpIntegration entities
3. Add HTTP controller endpoint: `GET /agents/:agentId/mcp-integrations`

## Acceptance Criteria

- [ ] Query created (`application/use-cases/list-agent-mcp-integrations/list-agent-mcp-integrations.query.ts`):
  - Contains only `agentId: string`
  - NO userId parameter (retrieved from ContextService)
- [ ] Use case created (`application/use-cases/list-agent-mcp-integrations/list-agent-mcp-integrations.use-case.ts`):
  - Decorated with `@Injectable()`
  - Injects `AgentsRepositoryPort`, `McpIntegrationsRepositoryPort`, and `ContextService`
  - Has `execute(query: ListAgentMcpIntegrationsQuery): Promise<McpIntegration[]>` method
  - Gets `userId` from ContextService at start of execution
  - Throws `UnauthorizedException` if user not authenticated
  - Validates agent exists via `agentsRepository.findOne(agentId, userId)`
  - Throws `AgentNotFoundError` if agent doesn't exist or user doesn't own it
  - Retrieves full integration entities for all IDs in `agent.mcpIntegrationIds`
  - Returns array of McpIntegration entities (not just IDs)
  - Handles case where integration IDs exist but integrations have been deleted (filters out nulls)
  - Wrapped in try/catch that re-throws ApplicationError and UnauthorizedException, wraps others in UnexpectedAgentError
- [ ] Controller endpoint added to `presenters/http/agents.controller.ts`:
  - `@Get(':agentId/mcp-integrations')`
  - Parameter: `@Param('agentId') agentId: UUID`
  - NO `@CurrentUser()` decorator (user comes from ContextService)
  - Creates query from parameter
  - Calls use case
  - Returns array of McpIntegrationResponseDto (via mapper)
  - Swagger decorators: `@ApiOperation`, `@ApiResponse` (200, 404)
- [ ] Use case registered in `agents.module.ts` providers
- [ ] Unit tests added for use case:
  - Returns array of full integration entities when agent has assigned integrations
  - Returns empty array when agent has no assigned integrations
  - Throws UnauthorizedException when user not authenticated
  - Throws AgentNotFoundError when agent doesn't exist
  - Throws AgentNotFoundError when agent exists but user doesn't own it
  - Filters out null values if integration IDs reference deleted integrations
  - Wraps unexpected errors in UnexpectedAgentError
- [ ] Integration test (optional but recommended):
  - GET endpoint returns 200 with array of integrations
  - GET endpoint returns empty array when agent has no integrations
  - GET endpoint returns 404 when agent not found
  - Response includes full integration details (id, name, type, enabled, etc.)

## Dependencies

- TICKET-021 (Agent entity must have mcpIntegrationIds property)
- TICKET-004 (McpIntegration entity and repository must exist)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Small

## Technical Notes

**Files to create**:
- `src/domain/agents/application/use-cases/list-agent-mcp-integrations/list-agent-mcp-integrations.query.ts`
- `src/domain/agents/application/use-cases/list-agent-mcp-integrations/list-agent-mcp-integrations.use-case.ts`

**Files to modify**:
- `src/domain/agents/presenters/http/agents.controller.ts` - Add GET endpoint
- `src/domain/agents/agents.module.ts` - Register use case in providers

**Use Case Pattern**:
```typescript
@Injectable()
export class ListAgentMcpIntegrationsUseCase {
  private readonly logger = new Logger(ListAgentMcpIntegrationsUseCase.name);

  constructor(
    @Inject(AgentsRepositoryPort)
    private readonly agentsRepository: AgentsRepositoryPort,
    @Inject(McpIntegrationsRepositoryPort)
    private readonly mcpIntegrationsRepository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: ListAgentMcpIntegrationsQuery): Promise<McpIntegration[]> {
    this.logger.log('Listing MCP integrations for agent', {
      agentId: query.agentId,
    });

    try {
      // Get user context
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Validate agent exists and user owns it
      const agent = await this.agentsRepository.findOne(query.agentId, userId);
      if (!agent) {
        throw new AgentNotFoundError(query.agentId);
      }

      // Fetch full integration entities
      const integrations = await Promise.all(
        agent.mcpIntegrationIds.map(id =>
          this.mcpIntegrationsRepository.findById(id)
        )
      );

      // Filter out nulls (in case integrations were deleted)
      return integrations.filter((integration): integration is McpIntegration =>
        integration !== null
      );
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Unexpected error listing agent MCP integrations', {
        error: error as Error,
      });
      throw new UnexpectedAgentError('Unexpected error occurred', { error: error as Error });
    }
  }
}
```

**Controller Pattern**:
```typescript
@Get(':agentId/mcp-integrations')
@ApiOperation({ summary: 'List MCP integrations assigned to agent' })
@ApiResponse({ status: 200, type: [McpIntegrationResponseDto] })
@ApiResponse({ status: 404, description: 'Agent not found' })
async listAgentMcpIntegrations(
  @Param('agentId') agentId: UUID,
): Promise<McpIntegrationResponseDto[]> {
  const integrations = await this.listAgentMcpIntegrationsUseCase.execute(
    new ListAgentMcpIntegrationsQuery(agentId),
  );
  return integrations.map(integration =>
    this.mcpIntegrationDtoMapper.toDto(integration)
  );
}
```

**Important Notes**:
- This is a **user-level authorization** endpoint (no `@Roles()` decorator)
- Authorization enforced at repository level: `agentsRepository.findOne(agentId, userId)`
- Users can only list integrations for agents they own
- Returns full integration entities, not just IDs (needed for UI display)
- Handles gracefully if integration IDs reference deleted integrations (filters them out)
- Empty array is a valid response (agent has no integrations)
- Controller needs to inject `McpIntegrationDtoMapper` to convert entities to DTOs
- Response type is array: `McpIntegrationResponseDto[]`
