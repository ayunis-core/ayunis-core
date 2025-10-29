# TICKET-007: Implement Create Predefined Integration Use Case

## Description

Implement the use case for creating a predefined MCP integration. This use case validates the slug against the registry, encrypts credentials (if provided), creates the domain entity, validates the connection, and persists it to the database.

**Why**: Organization admins need to enable predefined integrations by providing authentication credentials. The use case handles all business logic and validation.

**Technical Approach**:
1. Create command with slug, name, org ID, auth details
2. Validate slug exists in registry
3. Encrypt credentials if provided
4. Create domain entity
5. Validate connection to MCP server (optional - can be separate step)
6. Save to repository
7. Return created entity

## Acceptance Criteria

- [x] `CreatePredefinedMcpIntegrationCommand` created in `src/domain/mcp/application/use-cases/create-mcp-integration/create-predefined-mcp-integration.command.ts`
- [x] Command fields: `name`, `slug`, `authMethod?`, `authHeaderName?`, `encryptedCredentials?` (organizationId comes from ContextService, not command)
- [x] `CreateMcpIntegrationUseCase` created in `src/domain/mcp/application/use-cases/create-mcp-integration/create-mcp-integration.use-case.ts`
- [x] Use case injects: `McpIntegrationsRepositoryPort`, `PredefinedMcpIntegrationRegistryService`, `ContextService`
- [x] Use case validates slug exists in registry (throws error if invalid)
- [x] Use case retrieves `orgId` from `ContextService` and verifies user is authenticated
- [x] Use case creates `PredefinedMcpIntegration` domain entity
- [x] Use case saves entity via repository
- [x] Use case returns created entity
- [x] Domain errors added to `src/domain/mcp/application/mcp.errors.ts`: `InvalidPredefinedSlugError`, `UnexpectedMcpError`
- [x] Use case throws domain errors (not HTTP exceptions)
- [x] Use case has try/catch block that re-throws `ApplicationError` and wraps unexpected errors
- [x] Use case uses Logger to log operation start and errors
- [x] Unit tests added for:
  - Successfully creates predefined integration with auth
  - Successfully creates predefined integration without auth (optional auth)
  - Throws `InvalidPredefinedSlugError` for unknown slug
  - Throws `UnauthorizedException` when user not authenticated
  - Uses organizationId from ContextService (not from command)
  - Wraps unexpected errors in `UnexpectedMcpError`
  - Logger logs operation and errors

## Dependencies

- TICKET-002 (credential encryption service)
- TICKET-004 (repository and domain entities)
- TICKET-006 (registry service)

## Status

- [x] To Do
- [x] In Progress
- [x] Done

## Complexity

Medium

## Technical Notes

**Files to create**:
- `src/domain/mcp/application/use-cases/create-mcp-integration/create-predefined-mcp-integration.command.ts`
- `src/domain/mcp/application/use-cases/create-mcp-integration/create-mcp-integration.use-case.ts`
- `src/domain/mcp/application/mcp.errors.ts` (if doesn't exist)

**Error Pattern**:
```typescript
export enum McpErrorCode {
  INVALID_PREDEFINED_SLUG = 'INVALID_PREDEFINED_SLUG',
  MCP_INTEGRATION_NOT_FOUND = 'MCP_INTEGRATION_NOT_FOUND',
  UNEXPECTED_MCP_ERROR = 'UNEXPECTED_MCP_ERROR',
}

export abstract class McpError extends ApplicationError {
  constructor(message: string, code: McpErrorCode, statusCode: number, metadata?: ErrorMetadata) {
    super(message, code, statusCode, metadata);
  }

  toHttpException() {
    switch (this.statusCode) {
      case 404: return new NotFoundException({ code: this.code, message: this.message });
      default: return new BadRequestException({ code: this.code, message: this.message });
    }
  }
}

export class InvalidPredefinedSlugError extends McpError {
  constructor(slug: string, metadata?: ErrorMetadata) {
    super(`Invalid predefined integration slug: ${slug}`, McpErrorCode.INVALID_PREDEFINED_SLUG, 400, metadata);
  }
}
```

**Use Case Pattern**:
```typescript
@Injectable()
export class CreateMcpIntegrationUseCase {
  private readonly logger = new Logger(CreateMcpIntegrationUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly registryService: PredefinedMcpIntegrationRegistryService,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: CreatePredefinedMcpIntegrationCommand): Promise<PredefinedMcpIntegration> {
    this.logger.log('createPredefinedIntegration', { slug: command.slug });

    try {
      // Get orgId from context
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }

      // Validate slug
      if (!this.registryService.isValidSlug(command.slug)) {
        throw new InvalidPredefinedSlugError(command.slug);
      }

      // Create entity (credentials already encrypted by controller)
      const integration = new PredefinedMcpIntegration(
        null,
        command.name,
        command.slug,
        orgId, // From context, not command
        true,
        command.authMethod,
        command.authHeaderName,
        command.encryptedCredentials,
      );

      return await this.repository.save(integration);
    } catch (error) {
      if (error instanceof ApplicationError || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Unexpected error creating predefined integration', { error });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }
}
```

**Testing Approach**:
- Mock all dependencies (repository, registry, context service)
- Test success path with all fields
- Test success path with minimal fields (no auth)
- Test error cases (invalid slug, no user)
- Verify orgId comes from context service
