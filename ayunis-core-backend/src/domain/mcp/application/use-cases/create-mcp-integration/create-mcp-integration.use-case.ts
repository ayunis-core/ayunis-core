import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { CreatePredefinedMcpIntegrationCommand } from './create-predefined-mcp-integration.command';
import { CreateCustomMcpIntegrationCommand } from './create-custom-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { PredefinedMcpIntegrationRegistry } from '../../registries/predefined-mcp-integration-registry.service';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegrationFactory } from '../../factories/mcp-integration.factory';
import { McpIntegrationAuthFactory } from '../../factories/mcp-integration-auth.factory';
import { McpCredentialEncryptionPort } from '../../ports/mcp-credential-encryption.port';
import { ConnectionValidationService } from '../../services/connection-validation.service';
import { McpAuthMethod } from 'src/domain/mcp/domain';
import { McpIntegrationKind } from 'src/domain/mcp/domain';
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
import { PredefinedMcpIntegration } from 'src/domain/mcp/domain';
import { CustomMcpIntegration } from 'src/domain/mcp/domain';
import {
  CredentialFieldType,
  PredefinedMcpIntegrationConfig,
} from 'src/domain/mcp/domain/predefined-mcp-integration-config';
import { McpIntegration, McpIntegrationAuth } from 'src/domain/mcp/domain';

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
    private readonly connectionValidationService: ConnectionValidationService,
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
    this.logger.log('createPredefinedIntegration', { slug: command.slug });

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
    this.logger.log('createCustomIntegration', {
      serverUrl: command.serverUrl,
    });

    try {
      if (!this.isValidUrl(command.serverUrl)) {
        throw new InvalidServerUrlError(command.serverUrl);
      }

      // Default to NO_AUTH if not provided; OAUTH is not implemented yet
      const authType = command.authMethod ?? McpAuthMethod.NO_AUTH;
      if (authType === McpAuthMethod.OAUTH) {
        throw new McpAuthNotImplementedError(McpAuthMethod.OAUTH);
      }

      const integration = this.factory.createIntegration({
        kind: McpIntegrationKind.CUSTOM,
        orgId,
        name: command.name,
        serverUrl: command.serverUrl,
        auth: await this.buildCustomAuth(authType, command),
        returnsPii: command.returnsPii,
      });

      return await this.saveAndValidate(integration);
    } catch (error) {
      return this.rethrowOrWrap(error, 'custom');
    }
  }

  private async buildCustomAuth(
    authType: McpAuthMethod,
    command: CreateCustomMcpIntegrationCommand,
  ): Promise<McpIntegrationAuth> {
    if (authType === McpAuthMethod.BEARER_TOKEN) {
      return this.authFactory.createAuth({
        method: McpAuthMethod.BEARER_TOKEN,
        authToken: await this.encryptRequiredCredentials(
          command,
          'Bearer token credentials are required',
        ),
      });
    }

    if (authType === McpAuthMethod.CUSTOM_HEADER) {
      return this.authFactory.createAuth({
        method: McpAuthMethod.CUSTOM_HEADER,
        secret: await this.encryptRequiredCredentials(
          command,
          'Header credentials are required',
        ),
        headerName: command.authHeaderName ?? 'X-API-Key',
      });
    }

    // NO_AUTH doesn't need any credentials
    return this.authFactory.createAuth({ method: McpAuthMethod.NO_AUTH });
  }

  private async encryptRequiredCredentials(
    command: CreateCustomMcpIntegrationCommand,
    message: string,
  ): Promise<string> {
    if (!command.credentials) {
      throw new McpValidationFailedError('', command.name, message);
    }
    return this.credentialEncryption.encrypt(command.credentials);
  }

  /** Persist first (validation needs the ID), then probe the connection without failing creation. */
  private async saveAndValidate<T extends McpIntegration>(
    integration: T,
  ): Promise<T> {
    const savedIntegration = await this.repository.save(integration);
    await this.connectionValidationService.validateAndUpdateStatus(
      savedIntegration,
    );
    return savedIntegration;
  }

  private rethrowOrWrap(error: unknown, kind: 'predefined' | 'custom'): never {
    if (
      error instanceof ApplicationError ||
      error instanceof UnauthorizedException
    ) {
      throw error;
    }

    this.logger.error(`Unexpected error creating ${kind} integration`, {
      error: error as Error,
    });
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
