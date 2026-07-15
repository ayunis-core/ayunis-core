import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UpdateMcpIntegrationCommand } from './update-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import {
  McpIntegrationNotFoundError,
  McpIntegrationAccessDeniedError,
  McpNotMarketplaceIntegrationError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { McpIntegration } from '../../../domain/mcp-integration.entity';
import { McpCredentialEncryptionPort } from '../../ports/mcp-credential-encryption.port';
import { McpAuthMethod } from '../../../domain/value-objects/mcp-auth-method.enum';
import { BearerMcpIntegrationAuth } from '../../../domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from '../../../domain/auth/custom-header-mcp-integration-auth.entity';
import { McpValidationFailedError } from '../../mcp.errors';
import { MarketplaceMcpIntegration } from '../../../domain/integrations/marketplace-mcp-integration.entity';
import { MarketplaceConfigService } from '../../services/marketplace-config.service';
import { ConnectionValidationService } from '../../services/connection-validation.service';

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

  @HandleUnexpectedErrors(UnexpectedMcpError)
  async execute(command: UpdateMcpIntegrationCommand): Promise<McpIntegration> {
    this.logger.log('updateMcpIntegration', { id: command.integrationId });

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

    // Update fields (only if provided)
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

    if (command.orgConfigValues !== undefined) {
      await this.updateOrgConfigValues(integration, command.orgConfigValues);
    }

    let saved = await this.repository.save(integration);

    if (command.orgConfigValues !== undefined) {
      saved =
        await this.connectionValidationService.validateAndUpdateStatus(saved);
    }

    return saved;
  }

  private async updateOrgConfigValues(
    integration: McpIntegration,
    orgConfigValues: Record<string, string>,
  ): Promise<void> {
    if (!(integration instanceof MarketplaceMcpIntegration)) {
      throw new McpNotMarketplaceIntegrationError(integration.id);
    }

    const mergedValues = await this.marketplaceConfigService.mergeForUpdate(
      integration.orgConfigValues,
      orgConfigValues,
      integration.configSchema.orgFields,
    );

    integration.updateOrgConfigValues(mergedValues);
  }

  private async rotateCredentials(
    integration: McpIntegration,
    credentials?: string,
    authHeaderName?: string,
  ): Promise<void> {
    const authMethod = integration.auth.getMethod();

    switch (authMethod) {
      case McpAuthMethod.BEARER_TOKEN:
        return this.rotateBearerToken(integration, credentials, authHeaderName);
      case McpAuthMethod.CUSTOM_HEADER:
        return this.rotateCustomHeader(
          integration,
          credentials,
          authHeaderName,
        );
      case McpAuthMethod.NO_AUTH:
      case McpAuthMethod.OAUTH:
        if (credentials !== undefined || authHeaderName !== undefined) {
          throw new McpValidationFailedError(
            integration.id,
            integration.name,
            authMethod === McpAuthMethod.NO_AUTH
              ? 'This integration does not support authentication credentials.'
              : `Credential rotation is not supported for auth method ${authMethod}.`,
          );
        }
        return;
    }
  }

  private async rotateBearerToken(
    integration: McpIntegration,
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
    (integration.auth as BearerMcpIntegrationAuth).setToken(encryptedToken);
  }

  private async rotateCustomHeader(
    integration: McpIntegration,
    credentials?: string,
    authHeaderName?: string,
  ): Promise<void> {
    const customAuth = integration.auth as CustomHeaderMcpIntegrationAuth;

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
