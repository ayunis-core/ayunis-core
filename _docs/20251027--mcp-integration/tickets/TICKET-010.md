# TICKET-010: Implement List Org MCP Integrations Use Case

## Description

Implement the use case for listing all MCP integrations belonging to the user's organization. This query returns all integrations (both predefined and custom) for the organization.

**Why**: Organization admins need to see all configured MCP integrations to manage them and assign them to agents.

**Technical Approach**:
1. Create query (no parameters needed)
2. Get user's orgId from ContextService
3. Fetch all integrations for organization from repository
4. Return list of entities

## Acceptance Criteria

- [ ] `ListOrgMcpIntegrationsQuery` created in `src/domain/mcp/application/use-cases/list-org-mcp-integrations/list-org-mcp-integrations.query.ts`
- [ ] Query has no fields (orgId comes from context)
- [ ] `ListOrgMcpIntegrationsUseCase` created in `src/domain/mcp/application/use-cases/list-org-mcp-integrations/list-org-mcp-integrations.use-case.ts`
- [ ] Use case injects: `McpIntegrationsRepositoryPort`, `ContextService`
- [ ] Use case retrieves `orgId` from `ContextService` and verifies user is authenticated
- [ ] Use case fetches all integrations for organization via `repository.findByOrganizationId(orgId)`
- [ ] Use case returns array of integration entities (empty array if none)
- [ ] Use case has try/catch block that re-throws `ApplicationError` and wraps unexpected errors
- [ ] Use case uses Logger to log operation start and errors
- [ ] Unit tests added for:
  - Successfully returns list of integrations for organization
  - Returns empty array when organization has no integrations
  - Throws `UnauthorizedException` when user not authenticated
  - Uses organizationId from ContextService (not from query)
  - Wraps unexpected errors in `UnexpectedMcpError`
  - Logger logs operation and errors

## Dependencies

- TICKET-004 (repository and domain entities)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Low

## Technical Notes

**Files to create**:
- `src/domain/mcp/application/use-cases/list-org-mcp-integrations/list-org-mcp-integrations.query.ts`
- `src/domain/mcp/application/use-cases/list-org-mcp-integrations/list-org-mcp-integrations.use-case.ts`

**Use Case Pattern**:
```typescript
@Injectable()
export class ListOrgMcpIntegrationsUseCase {
  private readonly logger = new Logger(ListOrgMcpIntegrationsUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: ListOrgMcpIntegrationsQuery): Promise<McpIntegration[]> {
    this.logger.log('listOrgMcpIntegrations');

    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }

      return await this.repository.findByOrganizationId(orgId);
    } catch (error) {
      if (error instanceof ApplicationError || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Unexpected error listing integrations', { error });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
```

**Repository Method Required**:
```typescript
// In mcp-integrations.repository.port.ts
abstract findByOrganizationId(organizationId: string): Promise<McpIntegration[]>;
```

**Testing Approach**:
- Mock repository and context service
- Test success path with multiple integrations
- Test empty list case
- Test error cases (no user)
- Verify orgId comes from context service
