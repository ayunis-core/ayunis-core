# TICKET-011: Implement Update MCP Integration Use Case

## Description

Implement the use case for updating an existing MCP integration. This command allows updating name, authentication method, header name, and credentials. Credentials are encrypted before storage.

**Why**: Organization admins need to modify integration settings (change credentials, update auth method, rename) as configurations evolve.

**Technical Approach**:
1. Create command with integration ID and update fields
2. Get user's orgId from ContextService
3. Fetch existing integration from repository
4. Verify integration belongs to user's organization
5. Update mutable fields on domain entity
6. Encrypt credentials if provided
7. Save updated entity via repository
8. Return updated entity

## Acceptance Criteria

- [ ] `UpdateMcpIntegrationCommand` created in `src/domain/mcp/application/use-cases/update-mcp-integration/update-mcp-integration.command.ts`
- [ ] Command fields: `integrationId`, `name?`, `authMethod?`, `authHeaderName?`, `encryptedCredentials?`
- [ ] `UpdateMcpIntegrationUseCase` created in `src/domain/mcp/application/use-cases/update-mcp-integration/update-mcp-integration.use-case.ts`
- [ ] Use case injects: `McpIntegrationsRepositoryPort`, `ContextService`
- [ ] Use case retrieves `orgId` from `ContextService` and verifies user is authenticated
- [ ] Use case fetches existing integration from repository
- [ ] Use case verifies integration belongs to user's organization
- [ ] Use case updates only provided fields (optional updates)
- [ ] Use case saves updated entity via repository
- [ ] Use case returns updated entity
- [ ] Use case throws domain errors (not HTTP exceptions)
- [ ] Use case has try/catch block that re-throws `ApplicationError` and wraps unexpected errors
- [ ] Use case uses Logger to log operation start and errors
- [ ] Unit tests added for:
  - Successfully updates integration with all fields
  - Successfully updates integration with partial fields
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

Medium

## Technical Notes

**Files to create**:
- `src/domain/mcp/application/use-cases/update-mcp-integration/update-mcp-integration.command.ts`
- `src/domain/mcp/application/use-cases/update-mcp-integration/update-mcp-integration.use-case.ts`

**Use Case Pattern**:
```typescript
@Injectable()
export class UpdateMcpIntegrationUseCase {
  private readonly logger = new Logger(UpdateMcpIntegrationUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: UpdateMcpIntegrationCommand): Promise<McpIntegration> {
    this.logger.log('updateMcpIntegration', { id: command.integrationId });

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

      // Update fields (domain entity should have update methods)
      if (command.name !== undefined) {
        integration.updateName(command.name);
      }
      if (command.authMethod !== undefined) {
        integration.updateAuth(
          command.authMethod,
          command.authHeaderName,
          command.encryptedCredentials,
        );
      }

      return await this.repository.save(integration);
    } catch (error) {
      if (error instanceof ApplicationError || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Unexpected error updating integration', { error });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
```

**Domain Entity Update Methods**:
The domain entity should expose methods like:
- `updateName(name: string): void`
- `updateAuth(method?, headerName?, credentials?): void`

**Testing Approach**:
- Mock repository and context service
- Test full update (all fields)
- Test partial update (only name, only auth, etc.)
- Test error cases (not found, wrong org, no user)
- Verify orgId comes from context service
