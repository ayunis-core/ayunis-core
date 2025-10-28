# TICKET-014: Implement Disable MCP Integration Use Case

## Description

Implement the use case for disabling an MCP integration. This command sets the `enabled` flag to `false`, preventing the integration from being used in conversations while preserving its configuration.

**Why**: Organization admins need to temporarily disable integrations without deleting them (e.g., for maintenance, troubleshooting, or cost control).

**Technical Approach**:
1. Create command with integration ID
2. Get user's orgId from ContextService
3. Fetch existing integration from repository
4. Verify integration belongs to user's organization
5. Set enabled flag to false via domain entity method
6. Save updated entity via repository
7. Return updated entity

## Acceptance Criteria

- [ ] `DisableMcpIntegrationCommand` created in `src/domain/mcp/application/use-cases/disable-mcp-integration/disable-mcp-integration.command.ts`
- [ ] Command fields: `integrationId`
- [ ] `DisableMcpIntegrationUseCase` created in `src/domain/mcp/application/use-cases/disable-mcp-integration/disable-mcp-integration.use-case.ts`
- [ ] Use case injects: `McpIntegrationsRepositoryPort`, `ContextService`
- [ ] Use case retrieves `orgId` from `ContextService` and verifies user is authenticated
- [ ] Use case fetches existing integration from repository
- [ ] Use case verifies integration belongs to user's organization
- [ ] Use case calls domain entity method to disable (e.g., `integration.disable()`)
- [ ] Use case saves updated entity via repository
- [ ] Use case returns updated entity
- [ ] Use case throws domain errors (not HTTP exceptions)
- [ ] Use case has try/catch block that re-throws `ApplicationError` and wraps unexpected errors
- [ ] Use case uses Logger to log operation start and errors
- [ ] Unit tests added for:
  - Successfully disables integration when user has access
  - Idempotent (disabling already-disabled integration succeeds)
  - Throws `McpIntegrationNotFoundError` when integration doesn't exist
  - Throws `McpIntegrationAccessDeniedError` when integration belongs to different organization
  - Throws `UnauthorizedException` when user not authenticated
  - Uses organizationId from ContextService (not from command)
  - Wraps unexpected errors in `UnexpectedMcpError`
  - Logger logs operation and errors

## Dependencies

- TICKET-004 (repository and domain entities)
- TICKET-009 (get integration for verification)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Low

## Technical Notes

**Files to create**:
- `src/domain/mcp/application/use-cases/disable-mcp-integration/disable-mcp-integration.command.ts`
- `src/domain/mcp/application/use-cases/disable-mcp-integration/disable-mcp-integration.use-case.ts`

**Use Case Pattern**:
```typescript
@Injectable()
export class DisableMcpIntegrationUseCase {
  private readonly logger = new Logger(DisableMcpIntegrationUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: DisableMcpIntegrationCommand): Promise<McpIntegration> {
    this.logger.log('disableMcpIntegration', { id: command.integrationId });

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

      integration.disable(); // Domain entity method

      return await this.repository.save(integration);
    } catch (error) {
      if (error instanceof ApplicationError || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Unexpected error disabling integration', { error });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
```

**Domain Entity Method**:
```typescript
// In mcp-integration.entity.ts
public disable(): void {
  this.enabled = false;
}
```

**Testing Approach**:
- Mock repository and context service
- Test success path with enabled integration
- Test idempotency (already disabled)
- Test error cases (not found, wrong org, no user)
- Verify orgId comes from context service

**Note**: Consider whether agents should handle disabled integrations gracefully at runtime (skip them during capability discovery rather than failing).
