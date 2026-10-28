import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { CreatePredefinedMcpIntegrationCommand } from './create-predefined-mcp-integration.command';
import { CreateCustomMcpIntegrationCommand } from './create-custom-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { PredefinedMcpIntegrationRegistry } from 'src/domain/mcp/application/registries/predefined-mcp-integration-registry.service';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegrationFactory } from 'src/domain/mcp/application/factories/mcp-integration.factory';
import { McpIntegrationAuthFactory } from 'src/domain/mcp/application/factories/mcp-integration-auth.factory';
import { McpCredentialEncryptionPort } from 'src/domain/mcp/application/ports/mcp-credential-encryption.port';
import { ConnectionValidationService } from 'src/domain/mcp/application/services/connection-validation.service';
import { McpConfigService } from 'src/domain/mcp/application/services/mcp-config.service';
import { McpAuthMethod } from 'src/domain/mcp/domain';
import { McpIntegrationKind } from 'src/domain/mcp/domain';
import {
  InvalidPredefinedSlugError,
  InvalidServerUrlError,
  UnexpectedMcpError,
  DuplicateMcpIntegrationError,
  McpValidationFailedError,
} from 'src/domain/mcp/application/mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { UUID } from 'crypto';
import { PredefinedMcpIntegration } from 'src/domain/mcp/domain';
import { CustomMcpIntegration } from 'src/domain/mcp/domain';
import {
  CredentialFieldType,
  PredefinedMcpIntegrationConfig,
} from 'src/domain/mcp/domain/predefined-mcp-integration-config';
import { McpIntegration, McpIntegrationAuth } from 'src/domain/mcp/domain';
import { McpOAuthClientConfigurationService } from 'src/domain/mcp/application/services/mcp-oauth-client-configuration.service';

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
    private readonly configService: McpConfigService,
    private readonly connectionValidationService: ConnectionValidationService,
    private readonly oauthClientConfiguration: McpOAuthClientConfigurationService,
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
      CreatePredefinedMcpIntegrationCommand | CreateCustomMcpIntegrationCommand,
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
    this.logger.log({ slug: command.slug }, 'createPredefinedIntegration');

    try {
      if (!this.registryService.isValidSlug(command.slug)) {
        throw new InvalidPredefinedSlugError(command.slug);
      }
      const config = this.registryService.getConfig(command.slug);

      const existing = await this.repository.findByOrgIdAndSlug(
        orgId,
        command.slug,
      );
      if (existing) {
        throw new DuplicateMcpIntegrationError(command.slug);
      }

      const integration = this.factory.createIntegration({
        kind: McpIntegrationKind.PREDEFINED,
        orgId,
        slug: config.slug,
        name: config.displayName,
        serverUrl: config.serverUrl,
        auth: await this.buildPredefinedAuth(command, config),
        returnsPii: command.returnsPii,
      });

      return await this.saveAndValidate(integration);
    } catch (error) {
      return this.rethrowOrWrap(error, 'predefined');
    }
  }

  private async buildPredefinedAuth(
    command: CreatePredefinedMcpIntegrationCommand,
    config: PredefinedMcpIntegrationConfig,
  ): Promise<McpIntegrationAuth> {
    switch (config.authType) {
      case McpAuthMethod.NO_AUTH:
        return this.authFactory.createAuth({ method: McpAuthMethod.NO_AUTH });
      case McpAuthMethod.BEARER_TOKEN:
        return this.authFactory.createAuth({
          method: McpAuthMethod.BEARER_TOKEN,
          authToken: await this.encryptRequiredTokenField(
            command,
            config.displayName,
            'Bearer token credentials are required',
          ),
        });
      case McpAuthMethod.OAUTH:
        return this.authFactory.createAuth({
          method: McpAuthMethod.OAUTH,
          clientId:
            this.credentialFieldValue(command, CredentialFieldType.CLIENT_ID) ??
            '',
          clientSecret:
            this.credentialFieldValue(
              command,
              CredentialFieldType.CLIENT_SECRET,
            ) ?? '',
        });
      case McpAuthMethod.CUSTOM_HEADER:
        return this.authFactory.createAuth({
          method: McpAuthMethod.CUSTOM_HEADER,
          secret: await this.encryptRequiredTokenField(
            command,
            config.displayName,
            'Custom header secret is required',
          ),
          headerName: config.authHeaderName ?? 'X-API-Key',
        });
      default: {
        const exhaustiveCheck: never = config.authType;
        throw new Error(`Unknown MCP auth type: ${String(exhaustiveCheck)}`);
      }
    }
  }

  private credentialFieldValue(
    command: CreatePredefinedMcpIntegrationCommand,
    name: CredentialFieldType,
  ): string | undefined {
    return command.credentialFields.find((field) => field.name === name)?.value;
  }

  private async encryptRequiredTokenField(
    command: CreatePredefinedMcpIntegrationCommand,
    displayName: string,
    message: string,
  ): Promise<string> {
    const raw = this.credentialFieldValue(
      command,
      CredentialFieldType.TOKEN,
    )?.trim();
    if (!raw) {
      throw new McpValidationFailedError(
        '',
        displayName,
        message,
        CredentialFieldType.TOKEN,
      );
    }
    return this.credentialEncryption.encrypt(raw);
  }

  private async createCustomIntegration(
    command: CreateCustomMcpIntegrationCommand,
    orgId: UUID,
  ): Promise<CustomMcpIntegration> {
    this.logger.log({ url: command.serverUrl }, 'createCustomIntegration');

    try {
      if (!this.isValidUrl(command.serverUrl)) {
        throw new InvalidServerUrlError(command.serverUrl);
      }

      this.configService.validateCustomSchema(
        command.configSchema,
        command.orgConfigValues,
        command.name,
      );
      this.configService.validateRequiredFields(
        command.configSchema.orgFields,
        command.orgConfigValues,
      );
      const encryptedValues = await this.configService.encryptSecretFields(
        command.configSchema.orgFields,
        command.orgConfigValues,
      );

      const integration = this.factory.createIntegration({
        kind: McpIntegrationKind.CUSTOM,
        orgId,
        name: command.name,
        serverUrl: command.serverUrl,
        auth: this.authFactory.createAuth({ method: McpAuthMethod.NO_AUTH }),
        configSchema: command.configSchema,
        orgConfigValues: encryptedValues,
        returnsPii: command.returnsPii,
      });

      this.oauthClientConfiguration.validate(integration, command.oauthClient);

      const savedIntegration = await this.repository.save(integration);
      if (savedIntegration.configSchema.oauth) {
        return this.initializeOAuthClient(
          savedIntegration,
          command.oauthClient,
        );
      }
      return await this.validateSavedIntegration(savedIntegration);
    } catch (error) {
      return this.rethrowOrWrap(error, 'custom');
    }
  }

  /** Persist first (validation needs the ID), then probe the connection without failing creation. */
  private async saveAndValidate<T extends McpIntegration>(
    integration: T,
  ): Promise<T> {
    const savedIntegration = await this.repository.save(integration);
    return this.validateSavedIntegration(savedIntegration);
  }

  private async validateSavedIntegration<T extends McpIntegration>(
    savedIntegration: T,
  ): Promise<T> {
    await this.connectionValidationService.validateAndUpdateStatus(
      savedIntegration,
    );
    return savedIntegration;
  }

  private async initializeOAuthClient(
    integration: CustomMcpIntegration,
    oauthClient?: { clientId: string; clientSecret?: string },
  ): Promise<CustomMcpIntegration> {
    try {
      await this.oauthClientConfiguration.initialize(integration, oauthClient);
      return integration;
    } catch (error) {
      await this.repository.delete(integration.id);
      throw error;
    }
  }

  private rethrowOrWrap(error: unknown, kind: 'predefined' | 'custom'): never {
    if (
      error instanceof ApplicationError ||
      error instanceof UnauthorizedException
    ) {
      throw error;
    }

    this.logger.error(
      { err: error as Error, kind },
      'Unexpected error creating integration',
    );
    throw new UnexpectedMcpError('Unexpected error occurred');
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
