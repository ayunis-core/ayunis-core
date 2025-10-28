# TICKET-023: Implement Unassign MCP Integration from Agent Use Case

## Description

Implement the use case that allows unassigning (removing) an MCP integration from an agent. This operation validates that the user owns the agent and that the integration is currently assigned before removing it from the agent's integration list.

**Why**: Users need the ability to unassign MCP integrations from their agents to control which capabilities the agent has access to. This is a granular operation (one integration at a time) to support toggle-style UI interactions.

**Technical Approach**:
1. Create `UnassignMcpIntegrationFromAgentCommand` with `agentId` and `integrationId`
2. Create use case that:
   - Gets `userId` from `ContextService`
   - Validates agent exists and user owns it (via repository user-scoped query)
   - Checks integration is currently assigned to the agent
   - Updates agent entity by removing integration ID from `mcpIntegrationIds` array
   - Saves updated agent
3. Define domain error for "not assigned" validation failure
4. Add HTTP controller endpoint: `DELETE /agents/:agentId/mcp-integrations/:integrationId`

## Acceptance Criteria

- [ ] Command created (`application/use-cases/unassign-mcp-integration-from-agent/unassign-mcp-integration-from-agent.command.ts`):
  - Contains only `agentId: string` and `integrationId: string`
  - NO userId parameter (retrieved from ContextService)
- [ ] Use case created (`application/use-cases/unassign-mcp-integration-from-agent/unassign-mcp-integration-from-agent.use-case.ts`):
  - Decorated with `@Injectable()`
  - Injects `AgentsRepositoryPort` and `ContextService`
  - Has `execute(command: UnassignMcpIntegrationFromAgentCommand): Promise<Agent>` method
  - Gets `userId` from ContextService at start of execution
  - Throws `UnauthorizedException` if user not authenticated
  - Validates agent exists via `agentsRepository.findOne(agentId, userId)`
  - Throws `AgentNotFoundError` if agent doesn't exist or user doesn't own it
  - Throws `McpIntegrationNotAssignedError` if integrationId not in agent.mcpIntegrationIds
  - Updates agent by removing integrationId from mcpIntegrationIds array
  - Saves agent via repository
  - Returns updated agent
  - Wrapped in try/catch that re-throws ApplicationError and UnauthorizedException, wraps others in UnexpectedAgentError
- [ ] Domain error added to `application/agents.errors.ts`:
  - `McpIntegrationNotAssignedError` (404, code: `MCP_INTEGRATION_NOT_ASSIGNED`)
  - Extends `AgentError` base class
  - Has `toHttpException()` method returning NotFoundException
- [ ] Error code added to `AgentErrorCode` enum: `MCP_INTEGRATION_NOT_ASSIGNED`
- [ ] Controller endpoint added to `presenters/http/agents.controller.ts`:
  - `@Delete(':agentId/mcp-integrations/:integrationId')`
  - Parameters: `@Param('agentId') agentId: UUID`, `@Param('integrationId') integrationId: UUID`
  - NO `@CurrentUser()` decorator (user comes from ContextService)
  - Creates command from parameters
  - Calls use case
  - Returns AgentResponseDto (via mapper)
  - Swagger decorators: `@ApiOperation`, `@ApiResponse` (200, 404)
- [ ] Use case registered in `agents.module.ts` providers
- [ ] Unit tests added for use case:
  - Successfully unassigns integration when all validations pass
  - Throws UnauthorizedException when user not authenticated
  - Throws AgentNotFoundError when agent doesn't exist
  - Throws AgentNotFoundError when agent exists but user doesn't own it
  - Throws McpIntegrationNotAssignedError when integration not currently assigned
  - Wraps unexpected errors in UnexpectedAgentError
  - Integration ID is removed from agent.mcpIntegrationIds array
  - Updated agent is saved via repository
  - Other integration IDs remain in array (only specified one removed)
- [ ] Integration test (optional but recommended):
  - DELETE endpoint returns 200 when successful
  - DELETE endpoint returns 404 when agent not found
  - DELETE endpoint returns 404 when integration not assigned

## Dependencies

- TICKET-021 (Agent entity must have mcpIntegrationIds property)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Medium

## Technical Notes

**Files to create**:
- `src/domain/agents/application/use-cases/unassign-mcp-integration-from-agent/unassign-mcp-integration-from-agent.command.ts`
- `src/domain/agents/application/use-cases/unassign-mcp-integration-from-agent/unassign-mcp-integration-from-agent.use-case.ts`

**Files to modify**:
- `src/domain/agents/application/agents.errors.ts` - Add McpIntegrationNotAssignedError
- `src/domain/agents/presenters/http/agents.controller.ts` - Add DELETE endpoint
- `src/domain/agents/agents.module.ts` - Register use case in providers

**Use Case Pattern**:
```typescript
@Injectable()
export class UnassignMcpIntegrationFromAgentUseCase {
  private readonly logger = new Logger(UnassignMcpIntegrationFromAgentUseCase.name);

  constructor(
    @Inject(AgentsRepositoryPort)
    private readonly agentsRepository: AgentsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: UnassignMcpIntegrationFromAgentCommand): Promise<Agent> {
    this.logger.log('Unassigning MCP integration from agent', {
      agentId: command.agentId,
      integrationId: command.integrationId,
    });

    try {
      // Get user context
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Validate agent exists and user owns it
      const agent = await this.agentsRepository.findOne(command.agentId, userId);
      if (!agent) {
        throw new AgentNotFoundError(command.agentId);
      }

      // Check integration is currently assigned
      if (!agent.mcpIntegrationIds.includes(command.integrationId)) {
        throw new McpIntegrationNotAssignedError(command.integrationId);
      }

      // Update agent (remove integration ID)
      const updatedAgent = new Agent({
        ...agent,
        mcpIntegrationIds: agent.mcpIntegrationIds.filter(
          id => id !== command.integrationId
        ),
      });

      return await this.agentsRepository.save(updatedAgent);
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Unexpected error unassigning MCP integration', { error: error as Error });
      throw new UnexpectedAgentError('Unexpected error occurred', { error: error as Error });
    }
  }
}
```

**Controller Pattern**:
```typescript
@Delete(':agentId/mcp-integrations/:integrationId')
@ApiOperation({ summary: 'Unassign MCP integration from agent' })
@ApiResponse({ status: 200, type: AgentResponseDto })
@ApiResponse({ status: 404, description: 'Agent not found or integration not assigned' })
async unassignMcpIntegration(
  @Param('agentId') agentId: UUID,
  @Param('integrationId') integrationId: UUID,
): Promise<AgentResponseDto> {
  const agent = await this.unassignMcpIntegrationFromAgentUseCase.execute(
    new UnassignMcpIntegrationFromAgentCommand(agentId, integrationId),
  );
  return this.agentDtoMapper.toDto(agent);
}
```

**Domain Error**:
```typescript
export class McpIntegrationNotAssignedError extends AgentError {
  constructor(integrationId: string, metadata?: ErrorMetadata) {
    super(
      `MCP integration with ID ${integrationId} is not assigned to this agent`,
      AgentErrorCode.MCP_INTEGRATION_NOT_ASSIGNED,
      404,
      metadata,
    );
  }
}
```

**Important Notes**:
- This is a **user-level authorization** endpoint (no `@Roles()` decorator)
- Authorization enforced at repository level: `agentsRepository.findOne(agentId, userId)`
- Users can only unassign integrations from agents they own
- No need to validate integration exists - we only care if it's in the agent's list
- No need to check if integration is enabled/disabled - user can unassign regardless
- No need to check organization - integration ID is removed regardless of its current state
- Simpler validation than assign operation (only checks agent ownership and current assignment)
