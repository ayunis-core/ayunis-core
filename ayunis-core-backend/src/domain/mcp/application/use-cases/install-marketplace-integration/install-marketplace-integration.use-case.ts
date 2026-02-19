import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InstallMarketplaceIntegrationCommand } from './install-marketplace-integration.command';
import { GetMarketplaceIntegrationUseCase } from 'src/domain/marketplace/application/use-cases/get-marketplace-integration/get-marketplace-integration.use-case';
import { GetMarketplaceIntegrationQuery } from 'src/domain/marketplace/application/use-cases/get-marketplace-integration/get-marketplace-integration.query';
import { McpIntegrationsRepositoryPort } from '../../ports/mcp-integrations.repository.port';
import { McpIntegrationFactory } from '../../factories/mcp-integration.factory';
import { McpIntegrationAuthFactory } from '../../factories/mcp-integration-auth.factory';
import { MarketplaceConfigService } from '../../services/marketplace-config.service';
import { ConnectionValidationService } from '../../services/connection-validation.service';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegrationKind } from '../../../domain/value-objects/mcp-integration-kind.enum';
import { McpAuthMethod } from '../../../domain/value-objects/mcp-auth-method.enum';
import { MarketplaceMcpIntegration } from '../../../domain/integrations/marketplace-mcp-integration.entity';
import {
  IntegrationConfigSchema,
  ConfigField,
} from '../../../domain/value-objects/integration-config-schema';
/**
 * Runtime shape of the configSchema returned by the marketplace API.
 * The OpenAPI spec declares this as a generic object, so we cast at the boundary.
 */
interface MarketplaceConfigSchemaDto {
  authType: string;
  orgFields: Array<{
    key: string;
    label: string;
    type: 'text' | 'url' | 'secret';
    headerName: string | null;
    prefix: string | null;
    required: boolean;
    help: string | null;
    value: string | null;
  }>;
  userFields: Array<{
    key: string;
    label: string;
    type: 'text' | 'url' | 'secret';
    headerName: string | null;
    prefix: string | null;
    required: boolean;
    help: string | null;
    value: string | null;
  }>;
}
import {
  McpOAuthNotSupportedError,
  DuplicateMarketplaceMcpIntegrationError,
  UnexpectedMcpError,
} from '../../mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class InstallMarketplaceIntegrationUseCase {
  private readonly logger = new Logger(
    InstallMarketplaceIntegrationUseCase.name,
  );

  constructor(
    private readonly getMarketplaceIntegrationUseCase: GetMarketplaceIntegrationUseCase,
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly marketplaceConfigService: MarketplaceConfigService,
    private readonly factory: McpIntegrationFactory,
    private readonly authFactory: McpIntegrationAuthFactory,
    private readonly connectionValidationService: ConnectionValidationService,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    command: InstallMarketplaceIntegrationCommand,
  ): Promise<MarketplaceMcpIntegration> {
    this.logger.log('execute', { identifier: command.identifier });

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      const marketplaceIntegration =
        await this.getMarketplaceIntegrationUseCase.execute(
          new GetMarketplaceIntegrationQuery(command.identifier),
        );

      const existing =
        await this.repository.findByOrgIdAndMarketplaceIdentifier(
          orgId,
          command.identifier,
        );

      if (existing) {
        throw new DuplicateMarketplaceMcpIntegrationError(command.identifier);
      }

      const configSchema = this.parseConfigSchema(
        marketplaceIntegration.configSchema,
      );

      if (configSchema.authType === (McpAuthMethod.OAUTH as string)) {
        throw new McpOAuthNotSupportedError();
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

      const auth = this.authFactory.createAuth({
        method: McpAuthMethod.NO_AUTH,
      });

      const integration = this.factory.createIntegration({
        kind: McpIntegrationKind.MARKETPLACE,
        orgId,
        name: marketplaceIntegration.name,
        serverUrl: marketplaceIntegration.serverUrl,
        auth,
        marketplaceIdentifier: command.identifier,
        configSchema,
        orgConfigValues: encryptedValues,
        returnsPii: command.returnsPii,
      });

      const saved = await this.repository.save(integration);

      const validated =
        await this.connectionValidationService.validateAndUpdateStatus(saved);

      return validated as MarketplaceMcpIntegration;
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Unexpected error installing marketplace integration', {
        identifier: command.identifier,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }

  private parseConfigSchema(
    dto: Record<string, unknown>,
  ): IntegrationConfigSchema {
    const schema = dto as unknown as MarketplaceConfigSchemaDto;
    return {
      authType: schema.authType,
      orgFields: schema.orgFields.map((f) => this.parseConfigField(f)),
      userFields: schema.userFields.map((f) => this.parseConfigField(f)),
    };
  }

  private parseConfigField(
    field: MarketplaceConfigSchemaDto['orgFields'][number],
  ): ConfigField {
    return {
      key: field.key,
      label: field.label,
      type: field.type,
      headerName: field.headerName ?? undefined,
      prefix: field.prefix ?? undefined,
      required: field.required,
      help: field.help ?? undefined,
      value: field.value ?? undefined,
    };
  }
}
