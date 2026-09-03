import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InstallMarketplaceIntegrationCommand } from './install-marketplace-integration.command';
import { GetMarketplaceIntegrationUseCase } from 'src/domain/marketplace/application/use-cases/get-marketplace-integration/get-marketplace-integration.use-case';
import { GetMarketplaceIntegrationQuery } from 'src/domain/marketplace/application/use-cases/get-marketplace-integration/get-marketplace-integration.query';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { McpIntegrationFactory } from 'src/domain/mcp/application/factories/mcp-integration.factory';
import { McpIntegrationAuthFactory } from 'src/domain/mcp/application/factories/mcp-integration-auth.factory';
import { McpConfigService } from 'src/domain/mcp/application/services/mcp-config.service';
import { ConnectionValidationService } from 'src/domain/mcp/application/services/connection-validation.service';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegrationKind } from 'src/domain/mcp/domain/value-objects/mcp-integration-kind.enum';
import { McpAuthMethod } from 'src/domain/mcp/domain/value-objects/mcp-auth-method.enum';
import { MarketplaceMcpIntegration } from 'src/domain/mcp/domain/integrations/marketplace-mcp-integration.entity';
import {
  IntegrationConfigSchema,
  ConfigField,
} from 'src/domain/mcp/domain/value-objects/integration-config-schema';
import { MarketplaceIntegrationInstalledEvent } from 'src/domain/mcp/application/events/marketplace-integration-installed.event';
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
  oauth?: {
    clientRegistration: 'automatic' | 'static';
    scopes?: string[];
  };
}
import {
  DuplicateMarketplaceMcpIntegrationError,
  UnexpectedMcpError,
} from 'src/domain/mcp/application/mcp.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import type { UUID } from 'crypto';
import { McpOAuthClientConfigurationService } from 'src/domain/mcp/application/services/mcp-oauth-client-configuration.service';

@Injectable()
export class InstallMarketplaceIntegrationUseCase {
  private readonly logger = new Logger(
    InstallMarketplaceIntegrationUseCase.name,
  );

  constructor(
    private readonly getMarketplaceIntegrationUseCase: GetMarketplaceIntegrationUseCase,
    private readonly repository: McpIntegrationsRepositoryPort,
    private readonly configService: McpConfigService,
    private readonly factory: McpIntegrationFactory,
    private readonly authFactory: McpIntegrationAuthFactory,
    private readonly connectionValidationService: ConnectionValidationService,
    private readonly contextService: ContextService,
    private readonly eventEmitter: EventEmitter2,
    private readonly oauthClientConfiguration: McpOAuthClientConfigurationService,
  ) {}

  async execute(
    command: InstallMarketplaceIntegrationCommand,
  ): Promise<MarketplaceMcpIntegration> {
    this.logger.log({ identifier: command.identifier }, 'execute');

    const orgId = this.contextService.get('orgId');
    const userId = this.contextService.get('userId');
    if (!orgId || !userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      return await this.install(command, orgId, userId);
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(
        {
          identifier: command.identifier,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Unexpected error installing marketplace integration',
      );
      throw new UnexpectedMcpError('Unexpected error occurred');
    }
  }

  private async install(
    command: InstallMarketplaceIntegrationCommand,
    orgId: UUID,
    userId: UUID,
  ): Promise<MarketplaceMcpIntegration> {
    const marketplaceIntegration =
      await this.getMarketplaceIntegrationUseCase.execute(
        new GetMarketplaceIntegrationQuery(command.identifier),
      );
    await this.assertNotInstalled(orgId, command.identifier);
    const integration = await this.buildIntegration(
      command,
      orgId,
      marketplaceIntegration,
    );
    this.oauthClientConfiguration.validate(integration, command.oauthClient);
    const saved = await this.repository.save(integration);
    const validated = await this.initializeOrValidate(saved, command);
    this.emitInstalled(userId, orgId, marketplaceIntegration.identifier);
    return validated;
  }

  private async initializeOrValidate(
    integration: MarketplaceMcpIntegration,
    command: InstallMarketplaceIntegrationCommand,
  ): Promise<MarketplaceMcpIntegration> {
    if (integration.configSchema.oauth) {
      return this.initializeOAuthClient(integration, command.oauthClient);
    }
    return (await this.connectionValidationService.validateAndUpdateStatus(
      integration,
    )) as MarketplaceMcpIntegration;
  }

  private async initializeOAuthClient(
    integration: MarketplaceMcpIntegration,
    oauthClient?: { clientId: string; clientSecret?: string },
  ): Promise<MarketplaceMcpIntegration> {
    try {
      await this.oauthClientConfiguration.initialize(integration, oauthClient);
      return integration;
    } catch (error) {
      await this.repository.delete(integration.id);
      throw error;
    }
  }

  private async assertNotInstalled(
    orgId: UUID,
    identifier: string,
  ): Promise<void> {
    const existing = await this.repository.findByOrgIdAndMarketplaceIdentifier(
      orgId,
      identifier,
    );
    if (existing) throw new DuplicateMarketplaceMcpIntegrationError(identifier);
  }

  private async buildIntegration(
    command: InstallMarketplaceIntegrationCommand,
    orgId: UUID,
    marketplace: Awaited<
      ReturnType<GetMarketplaceIntegrationUseCase['execute']>
    >,
  ): Promise<MarketplaceMcpIntegration> {
    const configSchema = this.parseConfigSchema(marketplace.configSchema);
    const mergedValues = this.configService.mergeFixedValues(
      command.orgConfigValues,
      configSchema.orgFields,
    );
    this.configService.validateCustomSchema(
      configSchema,
      mergedValues,
      marketplace.name,
    );
    this.configService.validateRequiredFields(
      configSchema.orgFields,
      mergedValues,
    );
    const orgConfigValues = await this.configService.encryptSecretFields(
      configSchema.orgFields,
      mergedValues,
    );
    return this.factory.createIntegration({
      kind: McpIntegrationKind.MARKETPLACE,
      orgId,
      name: marketplace.name,
      serverUrl: marketplace.serverUrl,
      auth: this.authFactory.createAuth({ method: McpAuthMethod.NO_AUTH }),
      marketplaceIdentifier: command.identifier,
      configSchema,
      orgConfigValues,
      returnsPii: command.returnsPii,
      logoUrl: marketplace.logoUrl ?? null,
    });
  }

  private emitInstalled(userId: UUID, orgId: UUID, identifier: string): void {
    this.eventEmitter
      .emitAsync(
        MarketplaceIntegrationInstalledEvent.EVENT_NAME,
        new MarketplaceIntegrationInstalledEvent(userId, orgId, identifier),
      )
      .catch((error: unknown) => {
        this.logger.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            identifier,
            orgId,
          },
          'Failed to emit MarketplaceIntegrationInstalledEvent',
        );
      });
  }

  private parseConfigSchema(
    dto: Record<string, unknown>,
  ): IntegrationConfigSchema {
    const schema = dto as unknown as MarketplaceConfigSchemaDto;
    return {
      authType: schema.authType,
      orgFields: schema.orgFields.map((f) => this.parseConfigField(f)),
      userFields: schema.userFields.map((f) => this.parseConfigField(f)),
      oauth: schema.oauth,
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
