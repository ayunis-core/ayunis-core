import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { RetrieveMcpResourceCommand } from './retrieve-mcp-resource.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import {
  McpClientPort,
  McpConnectionConfig,
} from '../../ports/mcp-client.port';
import { McpCredentialEncryptionPort } from '../../ports/mcp-credential-encryption.port';
import { PredefinedMcpIntegrationRegistryService } from '../../services/predefined-mcp-integration-registry.service';
import { ContextService } from 'src/common/context/services/context.service';
import { CreateDataSourceUseCase } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.use-case';
import { CreateCSVDataSourceCommand } from 'src/domain/sources/application/use-cases/create-data-source/create-data-source.command';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  McpIntegrationDisabledError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  McpIntegration,
  PredefinedMcpIntegration,
  CustomMcpIntegration,
} from '../../../domain/mcp-integration.entity';

@Injectable()
export class RetrieveMcpResourceUseCase {
  private readonly logger = new Logger(RetrieveMcpResourceUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly mcpClient: McpClientPort,
    private readonly credentialEncryption: McpCredentialEncryptionPort,
    private readonly registryService: PredefinedMcpIntegrationRegistryService,
    private readonly createDataSourceUseCase: CreateDataSourceUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: RetrieveMcpResourceCommand): Promise<void> {
    const startTime = Date.now();
    this.logger.log(
      `[MCP] operation=retrieve_resource integration=${command.integrationId} uri="${command.resourceUri}" status=started`,
    );

    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const integration = await this.repository.findById(
        command.integrationId as UUID,
      );
      if (!integration) {
        throw new McpIntegrationNotFoundError(command.integrationId);
      }

      if (integration.organizationId !== orgId) {
        throw new McpIntegrationAccessDeniedError(
          command.integrationId,
          integration.name,
        );
      }

      if (!integration.enabled) {
        throw new McpIntegrationDisabledError(
          command.integrationId,
          integration.name,
        );
      }

      // Build connection config
      const connectionConfig = await this.buildConnectionConfig(integration);

      // Retrieve resource content with parameters (for URI template substitution)
      const { content, mimeType } = await this.mcpClient.readResource(
        connectionConfig,
        command.resourceUri,
        command.parameters,
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `[MCP] operation=retrieve_resource integration=${command.integrationId} name="${integration.name}" uri="${command.resourceUri}" mimeType="${mimeType}" status=success duration=${duration}ms`,
      );

      // Handle CSV resources
      if (mimeType === 'text/csv') {
        await this.handleCsvResource(content, command.resourceUri);
      }

      // Future: Handle other resource types (text, json, files, etc.)
    } catch (error) {
      const duration = Date.now() - startTime;

      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        this.logger.warn(
          `[MCP] operation=retrieve_resource integration=${command.integrationId} uri="${command.resourceUri}" status=error error="${error.message}" duration=${duration}ms`,
        );
        throw error;
      }

      this.logger.error(
        `[MCP] operation=retrieve_resource integration=${command.integrationId} uri="${command.resourceUri}" status=unexpected_error error="${(error as Error).message}" duration=${duration}ms`,
        { error: error as Error },
      );
      throw new UnexpectedMcpError(
        'Unexpected error occurred during resource retrieval',
      );
    }
  }

  /**
   * Handles CSV resource by parsing and creating a data source
   */
  private async handleCsvResource(
    content: string,
    resourceUri: string,
  ): Promise<void> {
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

  /**
   * Parses CSV content into headers and rows
   */
  private parseCsvContent(content: string): {
    headers: string[];
    rows: string[][];
  } {
    const lines = content.trim().split('\n');
    if (lines.length === 0) {
      return { headers: [], rows: [] };
    }

    // Parse headers (first line)
    const headers = this.parseCsvLine(lines[0]);

    // Parse rows (remaining lines)
    const rows = lines.slice(1).map((line) => this.parseCsvLine(line));

    return { headers, rows };
  }

  /**
   * Parses a single CSV line, handling quoted values
   */
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add last field
    result.push(current.trim());

    return result;
  }

  /**
   * Builds MCP connection config from integration entity
   */
  private async buildConnectionConfig(
    integration: McpIntegration,
  ): Promise<McpConnectionConfig> {
    let serverUrl: string;

    // Get server URL based on integration type
    if (integration.type === 'predefined') {
      const predefinedIntegration = integration as PredefinedMcpIntegration;
      const config = this.registryService.getConfig(predefinedIntegration.slug);
      serverUrl = config.url;
    } else {
      const customIntegration = integration as CustomMcpIntegration;
      serverUrl = customIntegration.serverUrl;
    }

    const connectionConfig: McpConnectionConfig = {
      serverUrl,
    };

    // Add authentication if configured
    if (
      integration.authMethod &&
      integration.authHeaderName &&
      integration.encryptedCredentials
    ) {
      const decryptedToken = await this.credentialEncryption.decrypt(
        integration.encryptedCredentials,
      );

      connectionConfig.authHeaderName = integration.authHeaderName;
      connectionConfig.authToken = decryptedToken;
    }

    return connectionConfig;
  }
}
