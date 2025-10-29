# TICKET-022: Implement Assign MCP Integration to Agent Use Case

## Description

Implement the use case that allows assigning an MCP integration to an agent. This operation validates that the user owns the agent, the integration exists and is enabled, belongs to the same organization, and is not already assigned before adding it to the agent's integration list.

**Why**: Users need the ability to assign MCP integrations to their agents so the agents can access MCP tools, resources, and prompts during conversation runs. This is a granular operation (one integration at a time) to support toggle-style UI interactions.

**Technical Approach**:
1. Create `AssignMcpIntegrationToAgentCommand` with `agentId` and `integrationId`
2. Create use case that:
   - Gets `userId` and `orgId` from `ContextService`
   - Validates agent exists and user owns it (via repository user-scoped query)
   - Validates integration exists, is enabled, and belongs to same org
   - Checks integration is not already assigned
   - Updates agent entity by adding integration ID to `mcpIntegrationIds` array
   - Saves updated agent
3. Define domain errors for all validation failures
4. Add HTTP controller endpoint: `POST /agents/:agentId/mcp-integrations/:integrationId`

## Acceptance Criteria

- [ ] Command created (`application/use-cases/assign-mcp-integration-to-agent/assign-mcp-integration-to-agent.command.ts`):
  - Contains only `agentId: string` and `integrationId: string`
  - NO userId or orgId parameters (retrieved from ContextService)
- [ ] Use case created (`application/use-cases/assign-mcp-integration-to-agent/assign-mcp-integration-to-agent.use-case.ts`):
  - Decorated with `@Injectable()`
  - Injects `AgentsRepositoryPort`, `McpIntegrationsRepositoryPort`, and `ContextService`
  - Has `execute(command: AssignMcpIntegrationToAgentCommand): Promise<Agent>` method
  - Gets `userId` and `orgId` from ContextService at start of execution
  - Throws `UnauthorizedException` if user not authenticated
  - Validates agent exists via `agentsRepository.findOne(agentId, userId)`
  - Throws `AgentNotFoundError` if agent doesn't exist or user doesn't own it
  - Validates integration exists via `mcpIntegrationsRepository.findById(integrationId)`
  - Throws `McpIntegrationNotFoundError` if integration doesn't exist
  - Throws `McpIntegrationDisabledError` if integration is disabled
  - Throws `McpIntegrationWrongOrganizationError` if integration.orgId !== orgId
  - Throws `McpIntegrationAlreadyAssignedError` if integrationId already in agent.mcpIntegrationIds
  - Updates agent by adding integrationId to mcpIntegrationIds array
  - Saves agent via repository
  - Returns updated agent
  - Wrapped in try/catch that re-throws ApplicationError and UnauthorizedException, wraps others in UnexpectedAgentError
- [ ] Domain errors added to `application/agents.errors.ts`:
  - `McpIntegrationNotFoundError` (404, code: `MCP_INTEGRATION_NOT_FOUND`)
  - `McpIntegrationAlreadyAssignedError` (409, code: `MCP_INTEGRATION_ALREADY_ASSIGNED`)
  - `McpIntegrationDisabledError` (400, code: `MCP_INTEGRATION_DISABLED`)
  - `McpIntegrationWrongOrganizationError` (403, code: `MCP_INTEGRATION_WRONG_ORGANIZATION`)
  - All extend `AgentError` base class
  - All have `toHttpException()` method with correct status codes
- [ ] Error codes added to `AgentErrorCode` enum
- [ ] Controller endpoint added to `presenters/http/agents.controller.ts`:
  - `@Post(':agentId/mcp-integrations/:integrationId')`
  - Parameters: `@Param('agentId') agentId: UUID`, `@Param('integrationId') integrationId: UUID`
  - NO `@CurrentUser()` decorator (user comes from ContextService)
  - Creates command from parameters
  - Calls use case
  - Returns AgentResponseDto (via mapper)
  - Swagger decorators: `@ApiOperation`, `@ApiResponse` (201, 400, 403, 404, 409)
- [ ] Use case registered in `agents.module.ts` providers
- [ ] Unit tests added for use case:
  - Successfully assigns integration when all validations pass
  - Throws UnauthorizedException when user not authenticated
  - Throws AgentNotFoundError when agent doesn't exist
  - Throws AgentNotFoundError when agent exists but user doesn't own it
  - Throws McpIntegrationNotFoundError when integration doesn't exist
  - Throws McpIntegrationDisabledError when integration is disabled
  - Throws McpIntegrationWrongOrganizationError when integration belongs to different org
  - Throws McpIntegrationAlreadyAssignedError when integration already assigned
  - Wraps unexpected errors in UnexpectedAgentError
  - Integration ID is added to agent.mcpIntegrationIds array
  - Updated agent is saved via repository
- [ ] Integration test (optional but recommended):
  - POST endpoint returns 201 when successful
  - POST endpoint returns 404 when agent not found
  - POST endpoint returns 409 when integration already assigned
  - POST endpoint returns 403 when integration belongs to different org

## Dependencies

- TICKET-021 (Agent entity must have mcpIntegrationIds property)
- TICKET-004 (McpIntegration entity and repository must exist)

## Status

- [ ] To Do
- [ ] In Progress
- [x] Done

## Complexity

Medium

## Technical Notes

**Files to create**:
- `src/domain/agents/application/use-cases/assign-mcp-integration-to-agent/assign-mcp-integration-to-agent.command.ts`
- `src/domain/agents/application/use-cases/assign-mcp-integration-to-agent/assign-mcp-integration-to-agent.use-case.ts`

**Files to modify**:
- `src/domain/agents/application/agents.errors.ts` - Add 4 new error classes and error codes
- `src/domain/agents/presenters/http/agents.controller.ts` - Add POST endpoint
- `src/domain/agents/agents.module.ts` - Register use case in providers

**Use Case Pattern** (ContextService + Domain Errors):
```typescript
@Injectable()
export class AssignMcpIntegrationToAgentUseCase {
  private readonly logger = new Logger(AssignMcpIntegrationToAgentUseCase.name);

  constructor(
    @Inject(AgentsRepositoryPort)
    private readonly agentsRepository: AgentsRepositoryPort,
    @Inject(McpIntegrationsRepositoryPort)
    private readonly mcpIntegrationsRepository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: AssignMcpIntegrationToAgentCommand): Promise<Agent> {
    this.logger.log('Assigning MCP integration to agent', {
      agentId: command.agentId,
      integrationId: command.integrationId,
    });

    try {
      // Get user context
      const userId = this.contextService.get('userId');
      const orgId = this.contextService.get('orgId');
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Validate agent exists and user owns it
      const agent = await this.agentsRepository.findOne(command.agentId, userId);
      if (!agent) {
        throw new AgentNotFoundError(command.agentId);
      }

      // Validate integration exists
      const integration = await this.mcpIntegrationsRepository.findById(command.integrationId);
      if (!integration) {
        throw new McpIntegrationNotFoundError(command.integrationId);
      }

      // Validate integration is enabled
      if (!integration.enabled) {
        throw new McpIntegrationDisabledError(command.integrationId);
      }

      // Validate integration belongs to same org
      if (integration.orgId !== orgId) {
        throw new McpIntegrationWrongOrganizationError(command.integrationId);
      }

      // Check not already assigned
      if (agent.mcpIntegrationIds.includes(command.integrationId)) {
        throw new McpIntegrationAlreadyAssignedError(command.integrationId);
      }

      // Update agent
      const updatedAgent = new Agent({
        ...agent,
        mcpIntegrationIds: [...agent.mcpIntegrationIds, command.integrationId],
      });

      return await this.agentsRepository.save(updatedAgent);
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Unexpected error assigning MCP integration', { error: error as Error });
      throw new UnexpectedAgentError('Unexpected error occurred', { error: error as Error });
    }
  }
}
```

**Controller Pattern** (No @CurrentUser):
```typescript
@Post(':agentId/mcp-integrations/:integrationId')
@ApiOperation({ summary: 'Assign MCP integration to agent' })
@ApiResponse({ status: 201, type: AgentResponseDto })
@ApiResponse({ status: 400, description: 'Integration disabled' })
@ApiResponse({ status: 403, description: 'Integration belongs to different organization' })
@ApiResponse({ status: 404, description: 'Agent or integration not found' })
@ApiResponse({ status: 409, description: 'Integration already assigned' })
async assignMcpIntegration(
  @Param('agentId') agentId: UUID,
  @Param('integrationId') integrationId: UUID,
): Promise<AgentResponseDto> {
  const agent = await this.assignMcpIntegrationToAgentUseCase.execute(
    new AssignMcpIntegrationToAgentCommand(agentId, integrationId),
  );
  return this.agentDtoMapper.toDto(agent);
}
```

**Domain Error Examples**:
```typescript
export enum AgentErrorCode {
  // ... existing codes
  MCP_INTEGRATION_NOT_FOUND = 'MCP_INTEGRATION_NOT_FOUND',
  MCP_INTEGRATION_ALREADY_ASSIGNED = 'MCP_INTEGRATION_ALREADY_ASSIGNED',
  MCP_INTEGRATION_DISABLED = 'MCP_INTEGRATION_DISABLED',
  MCP_INTEGRATION_WRONG_ORGANIZATION = 'MCP_INTEGRATION_WRONG_ORGANIZATION',
}

export class McpIntegrationNotFoundError extends AgentError {
  constructor(integrationId: string, metadata?: ErrorMetadata) {
    super(
      `MCP integration with ID ${integrationId} not found`,
      AgentErrorCode.MCP_INTEGRATION_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class McpIntegrationAlreadyAssignedError extends AgentError {
  constructor(integrationId: string, metadata?: ErrorMetadata) {
    super(
      `MCP integration with ID ${integrationId} is already assigned to this agent`,
      AgentErrorCode.MCP_INTEGRATION_ALREADY_ASSIGNED,
      409,
      metadata,
    );
  }
}
```

**Important Authorization Notes**:
- This is a **user-level authorization** endpoint (no `@Roles()` decorator)
- Authorization enforced at repository level: `agentsRepository.findOne(agentId, userId)`
- Users can only assign integrations to agents they own
- Organization boundary enforced by checking `integration.orgId === orgId`
- Users can only assign integrations from their own organization
