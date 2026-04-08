import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { UpdateMcpIntegrationCommand } from './update-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  McpNotMarketplaceIntegrationError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { McpIntegration } from '../../../domain/mcp-integration.entity';
import { McpCredentialEncryptionPort } from '../../ports/mcp-credential-encryption.port';
import { McpAuthMethod } from '../../../domain/value-objects/mcp-auth-method.enum';
import { BearerMcpIntegrationAuth } from '../../../domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from '../../../domain/auth/custom-header-mcp-integration-auth.entity';
import { McpValidationFailedError } from '../../mcp.errors';
import { MarketplaceMcpIntegration } from '../../../domain/integrations/marketplace-mcp-integration.entity';
import { SelfDefinedMcpIntegration } from '../../../domain/integrations/self-defined-mcp-integration.entity';
import { MarketplaceConfigService } from '../../services/marketplace-config.service';
import { ConnectionValidationService } from '../../services/connection-validation.service';
import { validateConfigSchema } from '../../services/integration-config-schema.validator';

@Injectable()
export class UpdateMcpIntegrationUseCase {
  private readonly logger = new Logger(UpdateMcpIntegrationUseCase.name);

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
    private readonly credentialEncryption: McpCredentialEncryptionPort,
    private readonly marketplaceConfigService: MarketplaceConfigService,
    private readonly connectionValidationService: ConnectionValidationService,
  ) {}

  async execute(command: UpdateMcpIntegrationCommand): Promise<McpIntegration> {
    this.logger.log('updateMcpIntegration', { id: command.integrationId });

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

      if (integration.orgId !== orgId) {
        throw new McpIntegrationAccessDeniedError(command.integrationId);
      }

      await this.applyFieldUpdates(integration, command);

      let saved = await this.repository.save(integration);

      const needsRevalidation =
        command.orgConfigValues !== undefined ||
        command.configSchema !== undefined ||
        command.oauthClientId !== undefined ||
        command.oauthClientSecret !== undefined;

      if (needsRevalidation) {
        saved =
          await this.connectionValidationService.validateAndUpdateStatus(saved);
      }

      return saved;
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Unexpected error updating integration', {
        error: error as Error,
      });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }

  private async applyFieldUpdates(
    integration: McpIntegration,
    command: UpdateMcpIntegrationCommand,
  ): Promise<void> {
    if (command.name !== undefined) {
      integration.updateName(command.name);
    }

    if (command.returnsPii !== undefined) {
      integration.updateReturnsPii(command.returnsPii);
    }

    if (
      command.credentials !== undefined ||
      command.authHeaderName !== undefined
    ) {
      await this.rotateCredentials(
        integration,
        command.credentials,
        command.authHeaderName,
      );
    }

    if (
      command.oauthClientId !== undefined ||
      command.oauthClientSecret !== undefined
    ) {
      await this.rotateOAuthClientCredentials(
        integration,
        command.oauthClientId,
        command.oauthClientSecret,
      );
    }

    if (command.configSchema !== undefined) {
      this.updateConfigSchema(integration, command.configSchema);
    }

    if (command.orgConfigValues !== undefined) {
      await this.updateOrgConfigValues(integration, command.orgConfigValues);
    }
  }

  private async rotateOAuthClientCredentials(
    integration: McpIntegration,
    oauthClientId?: string,
    oauthClientSecret?: string,
  ): Promise<void> {
    if (!integration.isMarketplace() && !integration.isSelfDefined()) {
      throw new McpValidationFailedError(
        integration.id,
        integration.name,
        'OAuth client credentials are only supported for MARKETPLACE and SELF_DEFINED integrations.',
      );
    }

    const newClientId = oauthClientId ?? integration.oauthClientId;
    if (!newClientId) {
      throw new McpValidationFailedError(
        integration.id,
        integration.name,
        'oauthClientId must be provided when setting OAuth client credentials.',
      );
    }

    const newSecret = oauthClientSecret
      ? await this.credentialEncryption.encrypt(oauthClientSecret)
      : integration.oauthClientSecretEncrypted;
    if (!newSecret) {
      throw new McpValidationFailedError(
        integration.id,
        integration.name,
        'oauthClientSecret must be provided when setting OAuth client credentials.',
      );
    }

    integration.setOAuthClientCredentials(newClientId, newSecret);
  }

  private updateConfigSchema(
    integration: McpIntegration,
    rawSchema: unknown,
  ): void {
    if (!(integration instanceof SelfDefinedMcpIntegration)) {
      throw new McpValidationFailedError(
        integration.id,
        integration.name,
        'configSchema can only be updated on SELF_DEFINED integrations.',
      );
    }

    // Validate and replace — a full re-validate of orgConfigValues against the
    // new schema is the caller's responsibility (typically done alongside an
    // orgConfigValues update in the same command).
    const validated = validateConfigSchema(rawSchema);

    integration.updateConfigSchema(validated);
  }

  private async updateOrgConfigValues(
    integration: McpIntegration,
    orgConfigValues: Record<string, string>,
  ): Promise<void> {
    if (
      integration instanceof MarketplaceMcpIntegration ||
      integration instanceof SelfDefinedMcpIntegration
    ) {
      const mergedValues = await this.marketplaceConfigService.mergeForUpdate(
        integration.orgConfigValues,
        orgConfigValues,
        integration.configSchema.orgFields,
      );
      integration.updateOrgConfigValues(mergedValues);
      return;
    }

    throw new McpNotMarketplaceIntegrationError(integration.id);
  }

  private async rotateCredentials(
    integration: McpIntegration,
    credentials?: string,
    authHeaderName?: string,
  ): Promise<void> {
    const auth = integration.auth;
    const authMethod = auth.getMethod();

    switch (authMethod) {
      case McpAuthMethod.NO_AUTH:
      case McpAuthMethod.OAUTH:
        this.rejectCredentialRotation(
          integration,
          authMethod,
          credentials,
          authHeaderName,
        );
        return;
      case McpAuthMethod.BEARER_TOKEN:
        await this.rotateBearerToken(
          integration,
          auth as BearerMcpIntegrationAuth,
          credentials,
          authHeaderName,
        );
        return;
      case McpAuthMethod.CUSTOM_HEADER:
        await this.rotateCustomHeader(
          integration,
          auth as CustomHeaderMcpIntegrationAuth,
          credentials,
          authHeaderName,
        );
        return;
    }
  }

  private rejectCredentialRotation(
    integration: McpIntegration,
    authMethod: McpAuthMethod,
    credentials?: string,
    authHeaderName?: string,
  ): void {
    if (credentials !== undefined || authHeaderName !== undefined) {
      const message =
        authMethod === McpAuthMethod.NO_AUTH
          ? 'This integration does not support authentication credentials.'
          : `Credential rotation is not supported for auth method ${authMethod}.`;
      throw new McpValidationFailedError(
        integration.id,
        integration.name,
        message,
      );
    }
  }

  private async rotateBearerToken(
    integration: McpIntegration,
    auth: BearerMcpIntegrationAuth,
    credentials?: string,
    authHeaderName?: string,
  ): Promise<void> {
    if (authHeaderName !== undefined) {
      throw new McpValidationFailedError(
        integration.id,
        integration.name,
        'Bearer token integrations always use the Authorization header.',
      );
    }

    if (credentials === undefined) {
      return;
    }

    const encryptedToken = await this.credentialEncryption.encrypt(credentials);
    auth.setToken(encryptedToken);
  }

  private async rotateCustomHeader(
    integration: McpIntegration,
    customAuth: CustomHeaderMcpIntegrationAuth,
    credentials?: string,
    authHeaderName?: string,
  ): Promise<void> {
    if (credentials !== undefined) {
      const encryptedSecret =
        await this.credentialEncryption.encrypt(credentials);
      const headerNameToUse = authHeaderName ?? customAuth.getAuthHeaderName();
      customAuth.setSecret(encryptedSecret, headerNameToUse);
      return;
    }

    if (authHeaderName !== undefined) {
      const currentSecret = customAuth.secret;
      if (!currentSecret) {
        throw new McpValidationFailedError(
          integration.id,
          integration.name,
          'Credentials must be configured before updating the header name.',
        );
      }
      customAuth.setSecret(currentSecret, authHeaderName);
    }
  }
}
