import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ValidateMcpIntegrationCommand } from './validate-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import {
  McpClientPort,
  McpConnectionConfig,
} from '../../ports/mcp-client.port';
import { McpCredentialEncryptionPort } from '../../ports/mcp-credential-encryption.port';
import { PredefinedMcpIntegrationRegistryService } from '../../services/predefined-mcp-integration-registry.service';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  McpIntegration,
  PredefinedMcpIntegration,
  CustomMcpIntegration,
} from '../../../domain/mcp-integration.entity';

/**
 * Result of MCP integration validation
 */
export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
  toolCount?: number;
  resourceCount?: number;
  promptCount?: number;
}

@Injectable()
export class ValidateMcpIntegrationUseCase {
  private readonly logger = new Logger(ValidateMcpIntegrationUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly mcpClient: McpClientPort,
    private readonly credentialEncryption: McpCredentialEncryptionPort,
    private readonly registryService: PredefinedMcpIntegrationRegistryService,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    command: ValidateMcpIntegrationCommand,
  ): Promise<ValidationResult> {
    this.logger.log('validateMcpIntegration');

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
        throw new McpIntegrationAccessDeniedError(
          command.integrationId,
          integration.name,
        );
      }

      // Build connection config
      const connectionConfig = await this.buildConnectionConfig(integration);

      // Attempt connection and capability discovery
      try {
        const [tools, resources, resourceTemplates, prompts] =
          await Promise.all([
            this.mcpClient.listTools(connectionConfig),
            this.mcpClient.listResources(connectionConfig),
            this.mcpClient.listResourceTemplates(connectionConfig),
            this.mcpClient.listPrompts(connectionConfig),
          ]);

        this.logger.log('validationSucceeded', {
          id: command.integrationId,
          toolCount: tools.length,
          resourceCount: resources.length,
          promptCount: prompts.length,
        });

        return {
          isValid: true,
          toolCount: tools.length,
          resourceCount: resources.length + resourceTemplates.length,
          promptCount: prompts.length,
        };
      } catch (connectionError) {
        const errorMsg =
          (connectionError as Error).message || 'Connection failed';

        this.logger.warn('validationFailed', {
          id: command.integrationId,
          error: errorMsg,
        });

        return {
          isValid: false,
          errorMessage: errorMsg,
        };
      }
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      this.logger.error('unexpectedError', {
        id: command.integrationId,
        error: error as Error,
      });
      throw new UnexpectedMcpError(
        'Unexpected error occurred during validation',
      );
    }
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
