# TICKET-012: Implement Delete MCP Integration Use Case

## Description

Implement the use case for deleting an MCP integration. This command removes the integration from the database. The implementation can use either soft delete (mark as deleted) or hard delete (remove record), depending on business requirements.

**Why**: Organization admins need to remove integrations that are no longer needed or incorrectly configured.

**Technical Approach**:
1. Create command with integration ID
2. Get user's orgId from ContextService
3. Fetch existing integration from repository
4. Verify integration belongs to user's organization
5. Delete integration via repository
6. Return void (or deleted entity for confirmation)

## Acceptance Criteria

- [ ] `DeleteMcpIntegrationCommand` created in `src/domain/mcp/application/use-cases/delete-mcp-integration/delete-mcp-integration.command.ts`
- [ ] Command fields: `integrationId`
- [ ] `DeleteMcpIntegrationUseCase` created in `src/domain/mcp/application/use-cases/delete-mcp-integration/delete-mcp-integration.use-case.ts`
- [ ] Use case injects: `McpIntegrationsRepositoryPort`, `ContextService`
- [ ] Use case retrieves `orgId` from `ContextService` and verifies user is authenticated
- [ ] Use case fetches existing integration from repository
- [ ] Use case verifies integration belongs to user's organization
- [ ] Use case deletes integration via `repository.delete(id)`
- [ ] Use case returns void
- [ ] Use case throws domain errors (not HTTP exceptions)
- [ ] Use case has try/catch block that re-throws `ApplicationError` and wraps unexpected errors
- [ ] Use case uses Logger to log operation start and errors
- [ ] Unit tests added for:
  - Successfully deletes integration when user has access
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
- `src/domain/mcp/application/use-cases/delete-mcp-integration/delete-mcp-integration.command.ts`
- `src/domain/mcp/application/use-cases/delete-mcp-integration/delete-mcp-integration.use-case.ts`

**Use Case Pattern**:
```typescript
@Injectable()
export class DeleteMcpIntegrationUseCase {
  private readonly logger = new Logger(DeleteMcpIntegrationUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: DeleteMcpIntegrationCommand): Promise<void> {
    this.logger.log('deleteMcpIntegration', { id: command.integrationId });

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

      await this.repository.delete(command.integrationId);
    } catch (error) {
      if (error instanceof ApplicationError || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Unexpected error deleting integration', { error });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
```

**Repository Method Required**:
```typescript
// In mcp-integrations.repository.port.ts
abstract delete(id: string): Promise<void>;
```

**Testing Approach**:
- Mock repository and context service
- Test success path with valid access
- Test error cases (not found, wrong org, no user)
- Verify orgId comes from context service
- Verify repository.delete() is called with correct ID

**Note**: Consider whether agents should be automatically updated to remove references to deleted integrations (cascade behavior). This could be handled:
1. Database-level cascade (if using foreign key constraints)
2. Application-level in this use case (fetch agents, update them)
3. Separate cleanup process
