# TICKET-016: Implement List Predefined Integration Configs Use Case

## Description

Implement the use case for listing all available predefined integration configurations from the registry. This query returns metadata about predefined integrations (name, slug, description, logo URL, auth requirements) without requiring authentication, as it's just registry information.

**Why**: Organization admins need to browse available predefined integrations to discover what they can enable in their organization.

**Technical Approach**:
1. Create query (no parameters, no auth required)
2. Fetch all predefined configs from registry service
3. Return list of config metadata

## Acceptance Criteria

- [ ] `ListPredefinedMcpIntegrationConfigsQuery` created in `src/domain/mcp/application/use-cases/list-predefined-mcp-integration-configs/list-predefined-mcp-integration-configs.query.ts`
- [ ] Query has no fields (public information, no auth needed)
- [ ] `ListPredefinedMcpIntegrationConfigsUseCase` created in `src/domain/mcp/application/use-cases/list-predefined-mcp-integration-configs/list-predefined-mcp-integration-configs.use-case.ts`
- [ ] Use case injects: `PredefinedMcpIntegrationRegistryService`
- [ ] Use case does NOT inject `ContextService` (no auth required for registry info)
- [ ] Use case calls registry service to get all predefined configs
- [ ] Use case returns array of `PredefinedMcpIntegrationConfig` objects
- [ ] Use case has try/catch block that wraps unexpected errors
- [ ] Use case uses Logger to log operation start and errors
- [ ] Unit tests added for:
  - Successfully returns list of predefined configs
  - Returns empty array when registry has no configs
  - Wraps unexpected errors in `UnexpectedMcpError`
  - Logger logs operation and errors
  - Does NOT require authentication (no ContextService calls)

## Dependencies

- TICKET-006 (registry service)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Low

## Technical Notes

**Files to create**:
- `src/domain/mcp/application/use-cases/list-predefined-mcp-integration-configs/list-predefined-mcp-integration-configs.query.ts`
- `src/domain/mcp/application/use-cases/list-predefined-mcp-integration-configs/list-predefined-mcp-integration-configs.use-case.ts`

**Use Case Pattern**:
```typescript
@Injectable()
export class ListPredefinedMcpIntegrationConfigsUseCase {
  private readonly logger = new Logger(ListPredefinedMcpIntegrationConfigsUseCase.name);

  constructor(
    private readonly registryService: PredefinedMcpIntegrationRegistryService,
  ) {}

  async execute(query: ListPredefinedMcpIntegrationConfigsQuery): Promise<PredefinedMcpIntegrationConfig[]> {
    this.logger.log('listPredefinedMcpIntegrationConfigs');

    try {
      return this.registryService.getAllConfigs();
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Unexpected error listing predefined configs', { error });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
```

**Registry Service Method**:
```typescript
// In predefined-mcp-integration-registry.service.ts
public getAllConfigs(): PredefinedMcpIntegrationConfig[] {
  return Array.from(this.registry.values());
}
```

**PredefinedMcpIntegrationConfig Interface** (from TICKET-006):
```typescript
export interface PredefinedMcpIntegrationConfig {
  slug: string;
  name: string;
  description: string;
  logoUrl?: string;
  serverUrl: string;
  transportType: McpTransportType;
  requiresAuth: boolean;
  authMethod?: McpAuthMethod;
  defaultAuthHeaderName?: string;
}
```

**Testing Approach**:
- Mock registry service only (no context service needed)
- Test success path with multiple configs
- Test empty registry case
- Verify no authentication required
- Verify unexpected errors are wrapped

**Note**: This endpoint should be accessible without authentication (public information about available integrations). The HTTP controller should use `@Public()` decorator if using global auth guards.
