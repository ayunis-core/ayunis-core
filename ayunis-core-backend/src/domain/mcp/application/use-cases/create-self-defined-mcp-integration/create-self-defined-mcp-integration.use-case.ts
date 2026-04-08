import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { CreateSelfDefinedMcpIntegrationCommand } from './create-self-defined-mcp-integration.command';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { McpCredentialEncryptionPort } from '../../ports/mcp-credential-encryption.port';
import { McpIntegrationFactory } from '../../factories/mcp-integration.factory';
import { MarketplaceConfigService } from '../../services/marketplace-config.service';
import { ConnectionValidationService } from '../../services/connection-validation.service';
import { validateConfigSchema } from '../../services/integration-config-schema.validator';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegrationKind } from '../../../domain/value-objects/mcp-integration-kind.enum';
import { NoAuthMcpIntegrationAuth } from '../../../domain/auth/no-auth-mcp-integration-auth.entity';
import { SelfDefinedMcpIntegration } from '../../../domain/integrations/self-defined-mcp-integration.entity';
import {
  McpOAuthClientNotConfiguredError,
  McpAuthorizationHeaderCollisionError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ConfigField } from '../../../domain/value-objects/integration-config-schema';

@Injectable()
export class CreateSelfDefinedMcpIntegrationUseCase {
  private readonly logger = new Logger(
    CreateSelfDefinedMcpIntegrationUseCase.name,
  );

  constructor(
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly credentialEncryption: McpCredentialEncryptionPort,
    private readonly factory: McpIntegrationFactory,
    private readonly marketplaceConfigService: MarketplaceConfigService,
    private readonly connectionValidationService: ConnectionValidationService,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    command: CreateSelfDefinedMcpIntegrationCommand,
  ): Promise<SelfDefinedMcpIntegration> {
    this.logger.log('Creating self-defined MCP integration', {
      name: command.name,
    });

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      const configSchema = validateConfigSchema(command.configSchema);

      if (configSchema.oauth) {
        if (!command.oauthClientId || !command.oauthClientSecret) {
          throw new McpOAuthClientNotConfiguredError();
        }
        this.assertNoAuthorizationHeaderCollision(
          configSchema.orgFields,
          configSchema.userFields,
        );
      }

      const mergedValues = this.marketplaceConfigService.mergeFixedValues(
        command.orgConfigValues,
        configSchema.orgFields,
      );

      this.marketplaceConfigService.validateRequiredFields(
        configSchema.orgFields,
        mergedValues,
      );

      const encryptedValues =
        await this.marketplaceConfigService.encryptSecretFields(
          configSchema.orgFields,
          mergedValues,
        );

      let encryptedClientSecret: string | undefined;
      if (configSchema.oauth && command.oauthClientSecret) {
        encryptedClientSecret = await this.credentialEncryption.encrypt(
          command.oauthClientSecret,
        );
      }

      const integration = this.factory.createIntegration({
        kind: McpIntegrationKind.SELF_DEFINED,
        orgId,
        name: command.name,
        serverUrl: command.serverUrl,
        auth: new NoAuthMcpIntegrationAuth(),
        configSchema,
        orgConfigValues: encryptedValues,
        returnsPii: command.returnsPii,
        description: command.description,
      });

      if (
        configSchema.oauth &&
        command.oauthClientId &&
        encryptedClientSecret
      ) {
        integration.setOAuthClientCredentials(
          command.oauthClientId,
          encryptedClientSecret,
        );
      }

      const saved = await this.repository.save(integration);

      const validated =
        await this.connectionValidationService.validateAndUpdateStatus(saved);

      return validated as SelfDefinedMcpIntegration;
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(
        'Unexpected error creating self-defined MCP integration',
        { error: error as Error },
      );
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }

  private assertNoAuthorizationHeaderCollision(
    orgFields: ConfigField[],
    userFields: ConfigField[],
  ): void {
    const allFields = [...orgFields, ...userFields];
    const hasCollision = allFields.some(
      (f) => f.headerName?.toLowerCase() === 'authorization',
    );
    if (hasCollision) {
      throw new McpAuthorizationHeaderCollisionError();
    }
  }
}
