# TICKET-025: Implement List Available MCP Integrations Use Case

## Description

Implement the use case that retrieves all enabled MCP integrations available to the user's organization. This allows users to see which integrations they can potentially assign to their agents, regardless of whether they're currently assigned.

**Why**: The UI needs to display all available MCP integrations so users can choose which ones to assign to their agents. Only enabled integrations from the user's organization should be shown as assignable options.

**Technical Approach**:
1. Create `ListAvailableMcpIntegrationsQuery` with `agentId` (for API consistency, though not strictly needed)
2. Create use case that:
   - Gets `orgId` from `ContextService`
   - Retrieves all enabled integrations for the organization
   - Returns array of McpIntegration entities
3. Add HTTP controller endpoint: `GET /agents/:agentId/mcp-integrations/available`

## Acceptance Criteria

- [ ] Query created (`application/use-cases/list-available-mcp-integrations/list-available-mcp-integrations.query.ts`):
  - Contains only `agentId: string` (for API consistency)
  - NO userId or orgId parameters (retrieved from ContextService)
- [ ] Use case created (`application/use-cases/list-available-mcp-integrations/list-available-mcp-integrations.use-case.ts`):
  - Decorated with `@Injectable()`
  - Injects `McpIntegrationsRepositoryPort` and `ContextService`
  - Has `execute(query: ListAvailableMcpIntegrationsQuery): Promise<McpIntegration[]>` method
  - Gets `orgId` from ContextService at start of execution
  - Throws `UnauthorizedException` if user not authenticated (no orgId)
  - Retrieves all enabled integrations for the organization via repository query
  - Returns array of McpIntegration entities
  - Wrapped in try/catch that re-throws ApplicationError and UnauthorizedException, wraps others in UnexpectedAgentError
- [ ] Controller endpoint added to `presenters/http/agents.controller.ts`:
  - `@Get(':agentId/mcp-integrations/available')`
  - Parameter: `@Param('agentId') agentId: UUID` (accepted but not used in use case)
  - NO `@CurrentUser()` decorator (user comes from ContextService)
  - Creates query from parameter
  - Calls use case
  - Returns array of McpIntegrationResponseDto (via mapper)
  - Swagger decorators: `@ApiOperation`, `@ApiResponse` (200)
- [ ] Use case registered in `agents.module.ts` providers
- [ ] Unit tests added for use case:
  - Returns array of enabled integrations for user's organization
  - Returns empty array when organization has no enabled integrations
  - Throws UnauthorizedException when user not authenticated (no orgId)
  - Filters out disabled integrations (only returns enabled ones)
  - Only returns integrations belonging to user's organization
  - Wraps unexpected errors in UnexpectedAgentError
- [ ] Integration test (optional but recommended):
  - GET endpoint returns 200 with array of available integrations
  - GET endpoint returns empty array when no integrations available
  - Response includes only enabled integrations
  - Response includes full integration details (id, name, type, enabled, etc.)

## Dependencies

- TICKET-004 (McpIntegration entity and repository must exist with findByOrgId method)

## Status

- [ ] To Do
- [ ] In Progress
- [x] Done

## Complexity

Small

## Technical Notes

**Files to create**:
- `src/domain/agents/application/use-cases/list-available-mcp-integrations/list-available-mcp-integrations.query.ts`
- `src/domain/agents/application/use-cases/list-available-mcp-integrations/list-available-mcp-integrations.use-case.ts`

**Files to modify**:
- `src/domain/agents/presenters/http/agents.controller.ts` - Add GET endpoint
- `src/domain/agents/agents.module.ts` - Register use case in providers

**Repository Method Assumption**:
This ticket assumes `McpIntegrationsRepositoryPort` has a method like:
```typescript
findByOrgId(orgId: string, onlyEnabled?: boolean): Promise<McpIntegration[]>
```
If this method doesn't exist, it should be added to the MCP integrations repository port and implementation.

**Use Case Pattern**:
```typescript
@Injectable()
export class ListAvailableMcpIntegrationsUseCase {
  private readonly logger = new Logger(ListAvailableMcpIntegrationsUseCase.name);

  constructor(
    @Inject(McpIntegrationsRepositoryPort)
    private readonly mcpIntegrationsRepository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: ListAvailableMcpIntegrationsQuery): Promise<McpIntegration[]> {
    this.logger.log('Listing available MCP integrations for organization');

    try {
      // Get org context
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Retrieve all enabled integrations for the organization
      const integrations = await this.mcpIntegrationsRepository.findByOrgId(
        orgId,
        true // onlyEnabled = true
      );

      return integrations;
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Unexpected error listing available MCP integrations', {
        error: error as Error,
      });
      throw new UnexpectedAgentError('Unexpected error occurred', { error: error as Error });
    }
  }
}
```

**Controller Pattern**:
```typescript
@Get(':agentId/mcp-integrations/available')
@ApiOperation({ summary: 'List available MCP integrations for organization' })
@ApiResponse({ status: 200, type: [McpIntegrationResponseDto] })
async listAvailableMcpIntegrations(
  @Param('agentId') agentId: UUID, // For API consistency, not used in logic
): Promise<McpIntegrationResponseDto[]> {
  const integrations = await this.listAvailableMcpIntegrationsUseCase.execute(
    new ListAvailableMcpIntegrationsQuery(agentId),
  );
  return integrations.map(integration =>
    this.mcpIntegrationDtoMapper.toDto(integration)
  );
}
```

**Important Notes**:
- This is a **user-level authorization** endpoint (no `@Roles()` decorator)
- No agent ownership check needed - endpoint shows all integrations available to user's org
- The `agentId` parameter is included for API consistency and RESTful routing, but not used in business logic
- Only **enabled** integrations are returned (disabled integrations are hidden from users)
- Organization boundary enforced by filtering integrations where `integration.orgId === orgId`
- Empty array is a valid response (organization has no enabled integrations)
- Controller needs to inject `McpIntegrationDtoMapper` to convert entities to DTOs
- Response type is array: `McpIntegrationResponseDto[]`
- This endpoint could be moved to a separate route (e.g., `GET /mcp-integrations?enabled=true`) but keeping it under agents for consistency with architecture document
