# TICKET-019: Implement Retrieve MCP Resource Use Case

## Description

Implement the use case for retrieving a resource from an MCP server. This command connects to the MCP server, fetches the specified resource (potentially with URI parameters), and handles special cases like CSV resources which are automatically converted to data sources. Returns void as the operation is a side-effect (creates data sources).

**Why**: During agent conversations, the LLM may need to access MCP resources. CSV resources should be automatically imported as data sources for agent use.

**Technical Approach**:
1. Create command with integration ID, resource URI, and optional parameters
2. Get user's orgId from ContextService (for authorization)
3. Fetch integration from repository
4. Verify integration belongs to user's organization and is enabled
5. Build connection config from integration
6. Connect to MCP server via client
7. Retrieve resource content with parameters (URI template substitution)
8. If resource is CSV: parse and create data source via CreateDataSourceUseCase with `createdBy: SourceCreator.SYSTEM`
9. If resource is other type: handle appropriately (future: store as file, etc.)

## Acceptance Criteria

- [x] `RetrieveMcpResourceCommand` created in `src/domain/mcp/application/use-cases/retrieve-mcp-resource/retrieve-mcp-resource.command.ts`
- [x] Command fields: `integrationId`, `resourceUri`, `parameters?: Record<string, unknown>`
- [x] `RetrieveMcpResourceUseCase` created in `src/domain/mcp/application/use-cases/retrieve-mcp-resource/retrieve-mcp-resource.use-case.ts`
- [x] Use case injects: `McpIntegrationsRepositoryPort`, `McpClientPort`, `PredefinedMcpIntegrationRegistryService`, `CreateDataSourceUseCase`, `ContextService`
- [x] Use case retrieves `orgId` from `ContextService` and verifies user is authenticated
- [x] Use case fetches integration from repository
- [x] Use case verifies integration belongs to user's organization
- [x] Use case verifies integration is enabled
- [x] Use case builds connection config from integration
- [x] Use case calls MCP client to retrieve resource with parameters
- [x] Use case handles CSV resources by parsing and calling `CreateDataSourceUseCase` with `createdBy: SourceCreator.SYSTEM`
- [x] Use case returns void (operation is a side-effect)
- [x] Use case throws domain errors (not HTTP exceptions)
- [x] Use case has try/catch block that re-throws `ApplicationError` and wraps unexpected errors
- [x] Use case uses Logger to log resource retrievals and operations
- [x] Unit tests added for:
  - Successfully retrieves CSV resource and creates data source
  - Successfully retrieves non-CSV resource (future: additional handling)
  - Handles parameterized resource URIs correctly (URI template substitution)
  - Throws `McpIntegrationNotFoundError` when integration doesn't exist
  - Throws `McpIntegrationAccessDeniedError` when integration belongs to different organization
  - Throws `McpIntegrationDisabledError` when integration is disabled
  - Throws `UnauthorizedException` when user not authenticated
  - Uses organizationId from ContextService (not from command)
  - Wraps unexpected errors in `UnexpectedMcpError`
  - Logger logs resource retrievals and operations

## Dependencies

- TICKET-001 (SourceCreator enum in sources module)
- TICKET-004 (repository and domain entities)
- TICKET-005 (MCP client)
- TICKET-006 (registry service)
- TICKET-009 (get integration for verification)
- Sources module: `CreateDataSourceUseCase`, `CreateCSVDataSourceCommand`

## Status

- [x] To Do
- [x] In Progress
- [x] Done

## Complexity

High

## Technical Notes

**Files to create**:
- `src/domain/mcp/application/use-cases/retrieve-mcp-resource/retrieve-mcp-resource.command.ts`
- `src/domain/mcp/application/use-cases/retrieve-mcp-resource/retrieve-mcp-resource.use-case.ts`

**Use Case Pattern**:
```typescript
import { CreateDataSourceUseCase } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.use-case';
import { CreateCSVDataSourceCommand } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.command';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';

@Injectable()
export class RetrieveMcpResourceUseCase {
  private readonly logger = new Logger(RetrieveMcpResourceUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly mcpClient: McpClientPort,
    private readonly registryService: PredefinedMcpIntegrationRegistryService,
    private readonly createDataSourceUseCase: CreateDataSourceUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: RetrieveMcpResourceCommand): Promise<void> {
    this.logger.log('retrieveMcpResource', {
      id: command.integrationId,
      uri: command.resourceUri,
    });

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

      if (!integration.enabled) {
        throw new McpIntegrationDisabledError(command.integrationId);
      }

      // Build connection config
      const connectionConfig = this.buildConnectionConfig(integration);

      // Retrieve resource with parameters (for URI template substitution)
      const { content, mimeType } = await this.mcpClient.readResource(
        connectionConfig,
        command.resourceUri,
        command.parameters,
      );

      this.logger.log('resourceRetrieved', {
        id: command.integrationId,
        uri: command.resourceUri,
        mimeType,
      });

      // Handle CSV resources
      if (mimeType === 'text/csv') {
        await this.handleCsvResource(content, command.resourceUri);
      }

      // Future: Handle other resource types (text, json, files, etc.)
    } catch (error) {
      if (error instanceof ApplicationError || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Unexpected error retrieving resource', { error });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }

  private async handleCsvResource(content: string, resourceUri: string): Promise<void> {
    this.logger.log('handlingCsvResource', { uri: resourceUri });

    // Parse CSV content
    const parsedCsv = this.parseCsvContent(content);

    // Create data source via sources module
    const createSourceCommand = new CreateCSVDataSourceCommand({
      name: `MCP Resource: ${resourceUri}`,
      data: {
        headers: parsedCsv.headers,
        rows: parsedCsv.rows,
      },
      createdBy: SourceCreator.SYSTEM, // Mark as system-created
    });

    await this.createDataSourceUseCase.execute(createSourceCommand);

    this.logger.log('csvResourceImported', { uri: resourceUri });
  }

  private parseCsvContent(content: string): { headers: string[]; rows: any[][] } {
    // CSV parsing logic (use library like papaparse or csv-parse)
    // Return structured data with headers and rows
  }

  private buildConnectionConfig(integration: McpIntegration): McpConnectionConfig {
    // Build from integration (URL, auth, transport)
  }
}
```

**Module Dependencies**:
```typescript
// In mcp.module.ts
import { SourcesModule } from 'src/domain/sources/sources.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([McpIntegrationRecord]),
    SourcesModule, // Import sources module for CreateDataSourceUseCase
  ],
  // ...
})
export class McpModule {}
```

**Testing Approach**:
- Mock repository, MCP client, registry service, CreateDataSourceUseCase, context service
- Test CSV resource retrieval and data source creation
- Test parameterized resource URIs (parameters passed correctly)
- Test disabled integration (throws error)
- Test error cases (not found, wrong org, no user)
- Verify orgId comes from context service
- Verify CreateDataSourceUseCase called with `createdBy: SourceCreator.SYSTEM`

**CSV Parsing**:
Consider using a library like `papaparse` or Node's `csv-parse` for robust CSV parsing.

**Integration with Runs Module**:
This use case will be called by the runs module when the LLM needs to access an MCP resource during conversation. CSV resources are automatically imported as data sources.

**URI Parameters**:
MCP resources can have parameterized URIs (e.g., `dataset://items?category={category}`). The parameters from the command are used for URI template substitution by the MCP client.
