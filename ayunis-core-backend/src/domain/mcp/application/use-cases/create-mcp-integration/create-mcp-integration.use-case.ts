import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { CreatePredefinedMcpIntegrationCommand } from './create-predefined-mcp-integration.command';
import { CreateCustomMcpIntegrationCommand } from './create-custom-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { PredefinedMcpIntegrationRegistry } from '../../registries/predefined-mcp-integration-registry.service';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegration } from '../../../domain/mcp-integration.entity';
import { McpIntegrationFactory } from '../../factories/mcp-integration.factory';
import { McpIntegrationAuthFactory } from '../../factories/mcp-integration-auth.factory';
import { McpCredentialEncryptionPort } from '../../ports/mcp-credential-encryption.port';
import { ValidateMcpIntegrationUseCase } from '../validate-mcp-integration/validate-mcp-integration.use-case';
import { McpAuthMethod } from '../../../domain/value-objects/mcp-auth-method.enum';
import { McpIntegrationKind } from '../../../domain/value-objects/mcp-integration-kind.enum';
import {
  InvalidPredefinedSlugError,
  InvalidServerUrlError,
  UnexpectedMcpError,
  McpAuthNotImplementedError,
  DuplicateMcpIntegrationError,
  McpValidationFailedError,
} from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { UUID } from 'crypto';
import { PredefinedMcpIntegration } from '../../../domain/integrations/predefined-mcp-integration.entity';
import { CustomMcpIntegration } from '../../../domain/integrations/custom-mcp-integration.entity';
import { CredentialFieldType } from 'src/domain/mcp/domain/predefined-mcp-integration-config';
import { McpIntegrationAuth } from 'src/domain/mcp/domain';

@Injectable()
export class CreateMcpIntegrationUseCase {
  private readonly logger = new Logger(CreateMcpIntegrationUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly registryService: PredefinedMcpIntegrationRegistry,
    private readonly contextService: ContextService,
    private readonly factory: McpIntegrationFactory,
    private readonly authFactory: McpIntegrationAuthFactory,
    private readonly credentialEncryption: McpCredentialEncryptionPort,
    private readonly validateUseCase: ValidateMcpIntegrationUseCase,
  ) {}

  // Overload signatures
  async execute(
    command: CreatePredefinedMcpIntegrationCommand,
  ): Promise<PredefinedMcpIntegration>;
  async execute(
    command: CreateCustomMcpIntegrationCommand,
  ): Promise<CustomMcpIntegration>;

  // Implementation
  async execute(
    command:
      | CreatePredefinedMcpIntegrationCommand
      | CreateCustomMcpIntegrationCommand,
  ): Promise<PredefinedMcpIntegration | CustomMcpIntegration> {
    // Get orgId from context first (common for both types)
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Determine command type and delegate
    if (command instanceof CreatePredefinedMcpIntegrationCommand) {
      return this.createPredefinedIntegration(command, orgId);
    } else {
      return this.createCustomIntegration(command, orgId);
    }
  }

  private async createPredefinedIntegration(
    command: CreatePredefinedMcpIntegrationCommand,
    orgId: UUID,
  ): Promise<PredefinedMcpIntegration> {
    this.logger.log('createPredefinedIntegration', { slug: command.slug });

    try {
      // Validate slug exists in registry
      if (!this.registryService.isValidSlug(command.slug)) {
        throw new InvalidPredefinedSlugError(command.slug);
      }

      // Get configuration from registry
      const config = this.registryService.getConfig(command.slug);

      // Check for duplicates
      const existing = await this.repository.findByOrgIdAndSlug(
        orgId,
        command.slug,
      );
      if (existing) {
        throw new DuplicateMcpIntegrationError(command.slug);
      }

      let integrationAuth: McpIntegrationAuth;
      switch (config.authType) {
        case McpAuthMethod.NO_AUTH:
          integrationAuth = this.authFactory.createAuth({
            method: McpAuthMethod.NO_AUTH,
          });
          break;
        case McpAuthMethod.BEARER_TOKEN:
          integrationAuth = this.authFactory.createAuth({
            method: McpAuthMethod.BEARER_TOKEN,
            authToken:
              command.credentialFields.find(
                (field) => field.name === CredentialFieldType.TOKEN,
              )?.value ?? '',
          });
          break;
        case McpAuthMethod.OAUTH:
          integrationAuth = this.authFactory.createAuth({
            method: McpAuthMethod.OAUTH,
            clientId:
              command.credentialFields.find(
                (field) => field.name === CredentialFieldType.CLIENT_ID,
              )?.value ?? '',
            clientSecret:
              command.credentialFields.find(
                (field) => field.name === CredentialFieldType.CLIENT_SECRET,
              )?.value ?? '',
          });
          break;
        default:
          throw new Error(`Unknown MCP auth type: ${config.authType}`);
      }

      const integration = this.factory.createIntegration({
        kind: McpIntegrationKind.PREDEFINED,
        orgId,
        slug: config.slug,
        name: config.displayName,
        serverUrl: config.serverUrl,
        auth: integrationAuth,
      });

      // Save integration first to get ID
      const savedIntegration = (await this.repository.save(
        integration,
      )) as PredefinedMcpIntegration;

      // Validate connection (don't throw on failure)
      await this.validateAndUpdateConnectionStatus(savedIntegration);

      // Return the updated integration
      return savedIntegration;
    } catch (error) {
      // Re-throw application errors and auth errors
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      // Log and wrap unexpected errors
      this.logger.error('Unexpected error creating predefined integration', {
        error: error as Error,
      });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }

  private async createCustomIntegration(
    command: CreateCustomMcpIntegrationCommand,
    orgId: UUID,
  ): Promise<CustomMcpIntegration> {
    this.logger.log('createCustomIntegration', {
      serverUrl: command.serverUrl,
    });

    try {
      // Validate URL format
      if (!this.isValidUrl(command.serverUrl)) {
        throw new InvalidServerUrlError(command.serverUrl);
      }

      // Determine auth type (default to NO_AUTH if not provided)
      const authType = command.authMethod ?? McpAuthMethod.NO_AUTH;

      // Handle OAUTH - not implemented yet
      if (authType === McpAuthMethod.OAUTH) {
        throw new McpAuthNotImplementedError(McpAuthMethod.OAUTH);
      }

      // Create integration using factory and handle credentials based on auth type
      let integration: CustomMcpIntegration;

      if (authType === McpAuthMethod.BEARER_TOKEN) {
        if (!command.credentials) {
          throw new McpValidationFailedError(
            '',
            command.name,
            'Bearer token credentials are required',
          );
        }

        const encryptedToken = await this.credentialEncryption.encrypt(
          command.credentials,
        );

        const auth = this.authFactory.createAuth({
          method: McpAuthMethod.BEARER_TOKEN,
          authToken: encryptedToken,
        });

        integration = this.factory.createIntegration({
          kind: McpIntegrationKind.CUSTOM,
          orgId,
          name: command.name,
          serverUrl: command.serverUrl,
          auth,
        });
      } else if (authType === McpAuthMethod.CUSTOM_HEADER) {
        if (!command.credentials) {
          throw new McpValidationFailedError(
            '',
            command.name,
            'Header credentials are required',
          );
        }

        const encryptedKey = await this.credentialEncryption.encrypt(
          command.credentials,
        );

        const headerName = command.authHeaderName ?? 'X-API-Key';
        const auth = this.authFactory.createAuth({
          method: McpAuthMethod.CUSTOM_HEADER,
          secret: encryptedKey,
          headerName,
        });

        integration = this.factory.createIntegration({
          kind: McpIntegrationKind.CUSTOM,
          orgId,
          name: command.name,
          serverUrl: command.serverUrl,
          auth,
        });
      } else {
        // NO_AUTH doesn't need any credentials
        const auth = this.authFactory.createAuth({
          method: McpAuthMethod.NO_AUTH,
        });
        integration = this.factory.createIntegration({
          kind: McpIntegrationKind.CUSTOM,
          orgId,
          name: command.name,
          serverUrl: command.serverUrl,
          auth,
        });
      }

      // Save integration first to get ID
      const savedIntegration = (await this.repository.save(
        integration,
      )) as CustomMcpIntegration;

      // Validate connection (don't throw on failure)
      await this.validateAndUpdateConnectionStatus(savedIntegration);

      // Return the updated integration
      return savedIntegration;
    } catch (error) {
      // Re-throw application errors and auth errors
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      // Log and wrap unexpected errors
      this.logger.error('Unexpected error creating custom integration', {
        error: error as Error,
      });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }

  /**
   * Validates the MCP integration connection and updates its status.
   * Does not throw errors - captures them in the connection status.
   */
  private async validateAndUpdateConnectionStatus(
    integration: McpIntegration,
  ): Promise<void> {
    try {
      const validationResult = await this.validateUseCase.execute({
        integrationId: integration.id,
      });

      if (validationResult.isValid) {
        integration.updateConnectionStatus('healthy', undefined);
      } else {
        integration.updateConnectionStatus(
          'unhealthy',
          validationResult.errorMessage ?? 'Validation failed',
        );
      }
    } catch (error) {
      // Don't throw - just update status
      const errorMessage =
        error instanceof Error
          ? `Validation failed: ${error.message}`
          : 'Validation failed: Unknown error';

      integration.updateConnectionStatus('unhealthy', errorMessage);
    }

    // Save the updated connection status
    await this.repository.save(integration);
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      // Basic validation: must be http or https
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
