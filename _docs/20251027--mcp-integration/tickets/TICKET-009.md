# TICKET-009: Implement Get MCP Integration Use Case

## Description

Implement the use case for retrieving a single MCP integration by ID. This query validates the user has access to the integration (same organization) and returns the entity.

**Why**: Users need to view details of a specific MCP integration to inspect configuration and status.

**Technical Approach**:
1. Create query with integration ID
2. Get user's orgId from ContextService
3. Fetch integration from repository
4. Verify integration belongs to user's organization
5. Return entity

## Acceptance Criteria

- [x] `GetMcpIntegrationQuery` created in `src/domain/mcp/application/use-cases/get-mcp-integration/get-mcp-integration.query.ts`
- [x] Query fields: `integrationId`
- [x] `GetMcpIntegrationUseCase` created in `src/domain/mcp/application/use-cases/get-mcp-integration/get-mcp-integration.use-case.ts`
- [x] Use case injects: `McpIntegrationsRepositoryPort`, `ContextService`
- [x] Use case retrieves `orgId` from `ContextService` and verifies user is authenticated
- [x] Use case fetches integration via repository
- [x] Use case verifies integration belongs to user's organization
- [x] Use case returns integration entity
- [x] Domain errors added: `McpIntegrationNotFoundError`, `McpIntegrationAccessDeniedError`
- [x] Use case throws domain errors (not HTTP exceptions)
- [x] Use case has try/catch block that re-throws `ApplicationError` and wraps unexpected errors
- [x] Use case uses Logger to log operation start and errors
- [x] Unit tests added for:
  - Successfully retrieves integration when user has access
  - Throws `McpIntegrationNotFoundError` when integration doesn't exist
  - Throws `McpIntegrationAccessDeniedError` when integration belongs to different organization
  - Throws `UnauthorizedException` when user not authenticated
  - Uses organizationId from ContextService (not from query)
  - Wraps unexpected errors in `UnexpectedMcpError`
  - Logger logs operation and errors

## Dependencies

- TICKET-004 (repository and domain entities)

## Status

- [ ] To Do
- [ ] In Progress
- [x] Done

## Complexity

Low

## Technical Notes

**Files to create**:
- `src/domain/mcp/application/use-cases/get-mcp-integration/get-mcp-integration.query.ts`
- `src/domain/mcp/application/use-cases/get-mcp-integration/get-mcp-integration.use-case.ts`

**Error Pattern**:
```typescript
export class McpIntegrationAccessDeniedError extends McpError {
  constructor(integrationId: string, metadata?: ErrorMetadata) {
    super(
      `Access denied to MCP integration ${integrationId}`,
      McpErrorCode.MCP_INTEGRATION_ACCESS_DENIED,
      403,
      metadata,
    );
  }
}
```

**Use Case Pattern**:
```typescript
@Injectable()
export class GetMcpIntegrationUseCase {
  private readonly logger = new Logger(GetMcpIntegrationUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: GetMcpIntegrationQuery): Promise<McpIntegration> {
    this.logger.log('getMcpIntegration', { id: query.integrationId });

    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const integration = await this.repository.findById(query.integrationId);
      if (!integration) {
        throw new McpIntegrationNotFoundError(query.integrationId);
      }

      // Verify organization access
      if (integration.organizationId !== orgId) {
        throw new McpIntegrationAccessDeniedError(query.integrationId);
      }

      return integration;
    } catch (error) {
      if (error instanceof ApplicationError || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Unexpected error getting integration', { error });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
```

**Testing Approach**:
- Mock repository and context service
- Test success path with valid access
- Test error cases (not found, wrong org, no user)
- Verify orgId comes from context service
