# TICKET-027: Extend Agents Controller with MCP Endpoints

## Description

Extend the existing Agents controller with new endpoints for managing MCP integration assignments to agents. These endpoints allow users to assign/unassign integrations to their own agents, list assigned integrations, and view available integrations for assignment. This implements user-scoped authorization (users can only manage integrations on agents they own).

**Why**: Users need the ability to configure which MCP integrations their agents can use. These endpoints provide granular control over agent capabilities through a user-friendly API that integrates naturally with the existing agents resource structure.

**Technical Approach**:
1. Add new endpoints to existing `AgentsController` at `/api/agents/:agentId/mcp-integrations`
2. Reuse `McpIntegrationResponseDto` from MCP module (no new DTOs needed)
3. Use existing `AgentResponseDto` for agent-modifying operations
4. NO admin guard required - user-scoped authorization via repository
5. Use cases get `userId` and `orgId` from `ContextService`
6. All endpoints follow existing controller patterns (no `@CurrentUser()` extraction)

**Key Endpoints**:
- `GET /agents/:agentId/mcp-integrations` - List integrations assigned to agent
- `GET /agents/:agentId/mcp-integrations/available` - List available integrations for assignment
- `POST /agents/:agentId/mcp-integrations/:integrationId` - Assign integration to agent
- `DELETE /agents/:agentId/mcp-integrations/:integrationId` - Unassign integration from agent

## Acceptance Criteria

### Controller Endpoints

- [ ] `GET /agents/:agentId/mcp-integrations` endpoint added to `AgentsController`:
  - Decorator: `@Get(':agentId/mcp-integrations')`
  - NO `@Roles()` decorator (user-scoped authorization)
  - OpenAPI: `@ApiOperation({ summary: 'List MCP integrations assigned to agent' })`
  - OpenAPI: `@ApiParam({ name: 'agentId', type: 'string', format: 'uuid', description: 'The agent ID' })`
  - OpenAPI: `@ApiResponse({ status: 200, type: [McpIntegrationResponseDto], description: 'List of assigned integrations' })`
  - OpenAPI: `@ApiResponse({ status: 404, description: 'Agent not found or not owned by user' })`
  - Parameter: `@Param('agentId', ParseUUIDPipe) agentId: UUID`
  - Creates `ListAgentMcpIntegrationsQuery(agentId)`
  - Calls `ListAgentMcpIntegrationsUseCase`
  - Returns `McpIntegrationResponseDto[]` (reuses MCP mapper)
- [ ] `GET /agents/:agentId/mcp-integrations/available` endpoint added:
  - Decorator: `@Get(':agentId/mcp-integrations/available')`
  - NO `@Roles()` decorator (user-scoped authorization)
  - OpenAPI: `@ApiOperation({ summary: 'List available MCP integrations for agent assignment' })`
  - OpenAPI: `@ApiParam({ name: 'agentId', type: 'string', format: 'uuid', description: 'The agent ID' })`
  - OpenAPI: `@ApiResponse({ status: 200, type: [McpIntegrationResponseDto], description: 'List of available integrations from user organization' })`
  - OpenAPI: `@ApiResponse({ status: 404, description: 'Agent not found or not owned by user' })`
  - Parameter: `@Param('agentId', ParseUUIDPipe) agentId: UUID`
  - Creates `ListAvailableMcpIntegrationsQuery(agentId)`
  - Calls `ListAvailableMcpIntegrationsUseCase`
  - Returns `McpIntegrationResponseDto[]` (reuses MCP mapper)
- [ ] `POST /agents/:agentId/mcp-integrations/:integrationId` endpoint added:
  - Decorator: `@Post(':agentId/mcp-integrations/:integrationId')`
  - NO `@Roles()` decorator (user-scoped authorization)
  - OpenAPI: `@ApiOperation({ summary: 'Assign MCP integration to agent' })`
  - OpenAPI: `@ApiParam({ name: 'agentId', type: 'string', format: 'uuid', description: 'The agent ID' })`
  - OpenAPI: `@ApiParam({ name: 'integrationId', type: 'string', format: 'uuid', description: 'The integration ID to assign' })`
  - OpenAPI: `@ApiResponse({ status: 201, type: AgentResponseDto, description: 'Agent with integration assigned' })`
  - OpenAPI: `@ApiResponse({ status: 400, description: 'Integration disabled' })`
  - OpenAPI: `@ApiResponse({ status: 403, description: 'Integration belongs to different organization' })`
  - OpenAPI: `@ApiResponse({ status: 404, description: 'Agent or integration not found' })`
  - OpenAPI: `@ApiResponse({ status: 409, description: 'Integration already assigned to agent' })`
  - Parameters: `@Param('agentId', ParseUUIDPipe) agentId: UUID`, `@Param('integrationId', ParseUUIDPipe) integrationId: UUID`
  - Creates `AssignMcpIntegrationToAgentCommand(agentId, integrationId)`
  - Calls `AssignMcpIntegrationToAgentUseCase`
  - Maps result to `AgentResponseDto` via existing `AgentDtoMapper`
  - Returns updated agent
- [ ] `DELETE /agents/:agentId/mcp-integrations/:integrationId` endpoint added:
  - Decorator: `@Delete(':agentId/mcp-integrations/:integrationId')`
  - Status code: `@HttpCode(HttpStatus.OK)` (returns agent, not 204)
  - NO `@Roles()` decorator (user-scoped authorization)
  - OpenAPI: `@ApiOperation({ summary: 'Unassign MCP integration from agent' })`
  - OpenAPI: `@ApiParam({ name: 'agentId', type: 'string', format: 'uuid', description: 'The agent ID' })`
  - OpenAPI: `@ApiParam({ name: 'integrationId', type: 'string', format: 'uuid', description: 'The integration ID to unassign' })`
  - OpenAPI: `@ApiResponse({ status: 200, type: AgentResponseDto, description: 'Agent with integration unassigned' })`
  - OpenAPI: `@ApiResponse({ status: 404, description: 'Agent not found, integration not found, or integration not assigned' })`
  - Parameters: `@Param('agentId', ParseUUIDPipe) agentId: UUID`, `@Param('integrationId', ParseUUIDPipe) integrationId: UUID`
  - Creates `UnassignMcpIntegrationFromAgentCommand(agentId, integrationId)`
  - Calls `UnassignMcpIntegrationFromAgentUseCase`
  - Maps result to `AgentResponseDto` via existing `AgentDtoMapper`
  - Returns updated agent

### Controller Modifications

- [ ] Inject new use cases in `AgentsController` constructor:
  - `private readonly assignMcpIntegrationToAgentUseCase: AssignMcpIntegrationToAgentUseCase`
  - `private readonly unassignMcpIntegrationFromAgentUseCase: UnassignMcpIntegrationFromAgentUseCase`
  - `private readonly listAgentMcpIntegrationsUseCase: ListAgentMcpIntegrationsUseCase`
  - `private readonly listAvailableMcpIntegrationsUseCase: ListAvailableMcpIntegrationsUseCase`
- [ ] Inject MCP mapper for response mapping:
  - `private readonly mcpIntegrationDtoMapper: McpIntegrationDtoMapper`
- [ ] Import necessary types from MCP module:
  - `McpIntegrationResponseDto` from `src/domain/mcp/presenters/http/dtos/mcp-integration-response.dto`
  - `McpIntegrationDtoMapper` from `src/domain/mcp/presenters/http/mappers/mcp-integration.mapper`

### Module Registration

- [ ] Use cases registered in `agents.module.ts`:
  - All 4 agent-MCP use cases added to `providers` array
  - MCP module imported in `imports` array (for accessing mapper and port)
  - No need to re-register mapper (imported from MCP module)

### Testing

- [ ] Unit tests added for new controller endpoints:
  - GET /agents/:agentId/mcp-integrations calls correct use case and maps to DTOs
  - GET /agents/:agentId/mcp-integrations/available calls correct use case and maps to DTOs
  - POST /agents/:agentId/mcp-integrations/:integrationId creates correct command
  - POST endpoint calls AssignMcpIntegrationToAgentUseCase
  - POST endpoint maps result to AgentResponseDto
  - DELETE /agents/:agentId/mcp-integrations/:integrationId creates correct command
  - DELETE endpoint calls UnassignMcpIntegrationFromAgentUseCase
  - DELETE endpoint maps result to AgentResponseDto
  - All endpoints have correct OpenAPI decorators
  - NO @Roles() decorators present (user-scoped authorization)
  - Controller properly injects all new dependencies

## Dependencies

- TICKET-022 (AssignMcpIntegrationToAgentUseCase)
- TICKET-023 (UnassignMcpIntegrationFromAgentUseCase)
- TICKET-024 (ListAgentMcpIntegrationsUseCase)
- TICKET-025 (ListAvailableMcpIntegrationsUseCase)
- TICKET-026 (McpIntegrationResponseDto and mapper)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Medium

## Technical Notes

**Files to modify**:
- `src/domain/agents/presenters/http/agents.controller.ts` - Add 4 new endpoints
- `src/domain/agents/agents.module.ts` - Register use cases and import MCP module

**Authorization Pattern**:
This implements **user-scoped authorization** (level 3 from CLAUDE.md):
- NO `@Roles()` decorator on any endpoint
- Users can only manage integrations on agents they own
- Authorization enforced at repository level: `agentsRepository.findOne(agentId, userId)`
- Use cases retrieve `userId` and `orgId` from `ContextService`
- Integration organization boundary checked in use case logic

**Controller Pattern** (Reuses Existing DTOs):
```typescript
import { McpIntegrationResponseDto } from 'src/domain/mcp/presenters/http/dtos/mcp-integration-response.dto';
import { McpIntegrationDtoMapper } from 'src/domain/mcp/presenters/http/mappers/mcp-integration.mapper';

@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  private readonly logger = new Logger(AgentsController.name);

  constructor(
    // ... existing use cases
    private readonly assignMcpIntegrationToAgentUseCase: AssignMcpIntegrationToAgentUseCase,
    private readonly unassignMcpIntegrationFromAgentUseCase: UnassignMcpIntegrationFromAgentUseCase,
    private readonly listAgentMcpIntegrationsUseCase: ListAgentMcpIntegrationsUseCase,
    private readonly listAvailableMcpIntegrationsUseCase: ListAvailableMcpIntegrationsUseCase,
    private readonly agentDtoMapper: AgentDtoMapper,
    private readonly mcpIntegrationDtoMapper: McpIntegrationDtoMapper, // From MCP module
  ) {}

  // ... existing endpoints

  @Get(':agentId/mcp-integrations')
  @ApiOperation({ summary: 'List MCP integrations assigned to agent' })
  @ApiParam({ name: 'agentId', type: 'string', format: 'uuid', description: 'The agent ID' })
  @ApiResponse({
    status: 200,
    type: [McpIntegrationResponseDto],
    description: 'List of assigned integrations',
  })
  @ApiResponse({ status: 404, description: 'Agent not found or not owned by user' })
  async listAgentMcpIntegrations(
    @Param('agentId', ParseUUIDPipe) agentId: UUID,
  ): Promise<McpIntegrationResponseDto[]> {
    this.logger.log('listAgentMcpIntegrations', { agentId });

    const integrations = await this.listAgentMcpIntegrationsUseCase.execute(
      new ListAgentMcpIntegrationsQuery(agentId),
    );

    return this.mcpIntegrationDtoMapper.toDtoArray(integrations);
  }

  @Get(':agentId/mcp-integrations/available')
  @ApiOperation({ summary: 'List available MCP integrations for agent assignment' })
  @ApiParam({ name: 'agentId', type: 'string', format: 'uuid', description: 'The agent ID' })
  @ApiResponse({
    status: 200,
    type: [McpIntegrationResponseDto],
    description: 'List of available integrations from user organization',
  })
  @ApiResponse({ status: 404, description: 'Agent not found or not owned by user' })
  async listAvailableMcpIntegrations(
    @Param('agentId', ParseUUIDPipe) agentId: UUID,
  ): Promise<McpIntegrationResponseDto[]> {
    this.logger.log('listAvailableMcpIntegrations', { agentId });

    const integrations = await this.listAvailableMcpIntegrationsUseCase.execute(
      new ListAvailableMcpIntegrationsQuery(agentId),
    );

    return this.mcpIntegrationDtoMapper.toDtoArray(integrations);
  }

  @Post(':agentId/mcp-integrations/:integrationId')
  @ApiOperation({ summary: 'Assign MCP integration to agent' })
  @ApiParam({ name: 'agentId', type: 'string', format: 'uuid', description: 'The agent ID' })
  @ApiParam({
    name: 'integrationId',
    type: 'string',
    format: 'uuid',
    description: 'The integration ID to assign',
  })
  @ApiResponse({
    status: 201,
    type: AgentResponseDto,
    description: 'Agent with integration assigned',
  })
  @ApiResponse({ status: 400, description: 'Integration disabled' })
  @ApiResponse({ status: 403, description: 'Integration belongs to different organization' })
  @ApiResponse({ status: 404, description: 'Agent or integration not found' })
  @ApiResponse({ status: 409, description: 'Integration already assigned to agent' })
  async assignMcpIntegration(
    @Param('agentId', ParseUUIDPipe) agentId: UUID,
    @Param('integrationId', ParseUUIDPipe) integrationId: UUID,
  ): Promise<AgentResponseDto> {
    this.logger.log('assignMcpIntegration', { agentId, integrationId });

    const agent = await this.assignMcpIntegrationToAgentUseCase.execute(
      new AssignMcpIntegrationToAgentCommand(agentId, integrationId),
    );

    return this.agentDtoMapper.toDto(agent);
  }

  @Delete(':agentId/mcp-integrations/:integrationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unassign MCP integration from agent' })
  @ApiParam({ name: 'agentId', type: 'string', format: 'uuid', description: 'The agent ID' })
  @ApiParam({
    name: 'integrationId',
    type: 'string',
    format: 'uuid',
    description: 'The integration ID to unassign',
  })
  @ApiResponse({
    status: 200,
    type: AgentResponseDto,
    description: 'Agent with integration unassigned',
  })
  @ApiResponse({
    status: 404,
    description: 'Agent not found, integration not found, or integration not assigned',
  })
  async unassignMcpIntegration(
    @Param('agentId', ParseUUIDPipe) agentId: UUID,
    @Param('integrationId', ParseUUIDPipe) integrationId: UUID,
  ): Promise<AgentResponseDto> {
    this.logger.log('unassignMcpIntegration', { agentId, integrationId });

    const agent = await this.unassignMcpIntegrationFromAgentUseCase.execute(
      new UnassignMcpIntegrationFromAgentCommand(agentId, integrationId),
    );

    return this.agentDtoMapper.toDto(agent);
  }
}
```

**Module Registration Pattern**:
```typescript
// agents.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { McpModule } from 'src/domain/mcp/mcp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentRecord]),
    forwardRef(() => McpModule), // Import for accessing mapper
    // ... other imports
  ],
  providers: [
    // ... existing providers
    AssignMcpIntegrationToAgentUseCase,
    UnassignMcpIntegrationFromAgentUseCase,
    ListAgentMcpIntegrationsUseCase,
    ListAvailableMcpIntegrationsUseCase,
  ],
  controllers: [AgentsController],
})
export class AgentsModule {}
```

**Import Requirements**:
```typescript
// Add to existing imports in agents.controller.ts
import { AssignMcpIntegrationToAgentCommand } from '../../application/use-cases/assign-mcp-integration-to-agent/assign-mcp-integration-to-agent.command';
import { UnassignMcpIntegrationFromAgentCommand } from '../../application/use-cases/unassign-mcp-integration-from-agent/unassign-mcp-integration-from-agent.command';
import { ListAgentMcpIntegrationsQuery } from '../../application/use-cases/list-agent-mcp-integrations/list-agent-mcp-integrations.query';
import { ListAvailableMcpIntegrationsQuery } from '../../application/use-cases/list-available-mcp-integrations/list-available-mcp-integrations.query';

import { AssignMcpIntegrationToAgentUseCase } from '../../application/use-cases/assign-mcp-integration-to-agent/assign-mcp-integration-to-agent.use-case';
import { UnassignMcpIntegrationFromAgentUseCase } from '../../application/use-cases/unassign-mcp-integration-from-agent/unassign-mcp-integration-from-agent.use-case';
import { ListAgentMcpIntegrationsUseCase } from '../../application/use-cases/list-agent-mcp-integrations/list-agent-mcp-integrations.use-case';
import { ListAvailableMcpIntegrationsUseCase } from '../../application/use-cases/list-available-mcp-integrations/list-available-mcp-integrations.use-case';

import { McpIntegrationResponseDto } from 'src/domain/mcp/presenters/http/dtos/mcp-integration-response.dto';
import { McpIntegrationDtoMapper } from 'src/domain/mcp/presenters/http/mappers/mcp-integration.mapper';
```

**Key Differences from TICKET-026**:
1. NO new DTOs created - reuses `McpIntegrationResponseDto` and `AgentResponseDto`
2. NO `@Roles()` decorators - user-scoped authorization
3. Extends existing controller instead of creating new one
4. Simpler because use cases already handle all business logic
5. DELETE returns updated agent (200) instead of 204 No Content

**Testing Approach**:
- Mock all use cases
- Test each endpoint creates correct command/query
- Verify correct use case is called
- Verify correct mapper is used (MCP mapper for integrations, Agent mapper for agent responses)
- Test that no @Roles() decorators are present
- Verify OpenAPI documentation is complete
- Test error responses match use case errors (404, 409, 403)
