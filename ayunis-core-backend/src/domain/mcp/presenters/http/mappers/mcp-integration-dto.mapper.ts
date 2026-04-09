import { Injectable } from '@nestjs/common';
import { McpIntegration } from '../../../domain/mcp-integration.entity';
import { McpIntegrationKind } from '../../../domain/value-objects/mcp-integration-kind.enum';
import { BearerMcpIntegrationAuth } from '../../../domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from '../../../domain/auth/custom-header-mcp-integration-auth.entity';
import { OAuthMcpIntegrationAuth } from '../../../domain/auth/oauth-mcp-integration-auth.entity';
import { McpIntegrationResponseDto } from '../dto/mcp-integration-response.dto';
import { PredefinedMcpIntegration } from 'src/domain/mcp/domain';
import { MarketplaceMcpIntegration } from 'src/domain/mcp/domain/integrations/marketplace-mcp-integration.entity';
import { SelfDefinedMcpIntegration } from 'src/domain/mcp/domain/integrations/self-defined-mcp-integration.entity';
import { ConfigField } from 'src/domain/mcp/domain/value-objects/integration-config-schema';
import { SECRET_MASK } from 'src/domain/mcp/domain/value-objects/secret-mask.constant';

/**
 * Mapper for converting MCP integration entities to DTOs.
 */
@Injectable()
export class McpIntegrationDtoMapper {
  /**
   * Converts an MCP integration entity to a response DTO.
   * Handles predefined, custom, and marketplace integration types.
   * IMPORTANT: Never includes authentication credentials in the response.
   *
   * @param integration - The MCP integration entity
   * @returns The DTO representation
   */
  toDto(integration: McpIntegration): McpIntegrationResponseDto {
    const baseDto = this.buildBaseDto(integration);

    if (integration instanceof MarketplaceMcpIntegration) {
      return this.enrichMarketplaceDto(baseDto, integration);
    }

    if (integration instanceof SelfDefinedMcpIntegration) {
      return this.enrichSelfDefinedDto(baseDto, integration);
    }

    if (integration instanceof PredefinedMcpIntegration) {
      return this.enrichPredefinedDto(baseDto, integration);
    }

    return this.enrichCustomDto(baseDto, integration);
  }

  private buildBaseDto(integration: McpIntegration): McpIntegrationResponseDto {
    return {
      id: integration.id,
      name: integration.name,
      type: this.resolveType(integration),
      enabled: integration.enabled,
      organizationId: integration.orgId,
      authMethod: integration.getAuthType(),
      authHeaderName: this.getAuthHeaderName(integration.auth),
      hasCredentials: integration.auth.hasCredentials(),
      connectionStatus: integration.connectionStatus,
      lastConnectionError: integration.lastConnectionError,
      lastConnectionCheck: integration.lastConnectionCheck,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
      returnsPii: integration.returnsPii,
      description: integration.description,
    };
  }

  private enrichMarketplaceDto(
    dto: McpIntegrationResponseDto,
    integration: MarketplaceMcpIntegration,
  ): McpIntegrationResponseDto {
    dto.marketplaceIdentifier = integration.marketplaceIdentifier;
    dto.configSchema = this.buildConfigSchemaDto(integration.configSchema);
    dto.hasUserFields = integration.configSchema.userFields.length > 0;
    dto.orgConfigValues = this.buildMaskedOrgConfigValues(
      integration.configSchema.orgFields,
      integration.orgConfigValues,
    );
    dto.logoUrl = integration.logoUrl;
    dto.serverUrl = undefined;
    dto.slug = undefined;
    dto.oauth = this.buildOAuthBlock(integration);
    return dto;
  }

  private enrichSelfDefinedDto(
    dto: McpIntegrationResponseDto,
    integration: SelfDefinedMcpIntegration,
  ): McpIntegrationResponseDto {
    dto.configSchema = this.buildConfigSchemaDto(integration.configSchema);
    dto.hasUserFields = integration.configSchema.userFields.length > 0;
    dto.orgConfigValues = this.buildMaskedOrgConfigValues(
      integration.configSchema.orgFields,
      integration.orgConfigValues,
    );
    dto.serverUrl = integration.serverUrl;
    dto.slug = undefined;
    dto.oauth = this.buildOAuthBlock(integration);
    return dto;
  }

  private enrichPredefinedDto(
    dto: McpIntegrationResponseDto,
    integration: PredefinedMcpIntegration,
  ): McpIntegrationResponseDto {
    dto.slug = integration.slug;
    dto.serverUrl = undefined;
    dto.oauth = this.buildOAuthBlock(integration);
    return dto;
  }

  private enrichCustomDto(
    dto: McpIntegrationResponseDto,
    integration: McpIntegration,
  ): McpIntegrationResponseDto {
    dto.slug = undefined;
    dto.serverUrl = integration.serverUrl;
    dto.oauth = this.buildOAuthBlock(integration);
    return dto;
  }

  private buildConfigSchemaDto(
    configSchema: MarketplaceMcpIntegration['configSchema'],
  ): NonNullable<McpIntegrationResponseDto['configSchema']> {
    return {
      authType: configSchema.authType,
      orgFields: configSchema.orgFields,
      userFields: configSchema.userFields,
    };
  }

  /**
   * Builds the OAuth status block for the response DTO.
   * Returns undefined for integrations without a configSchema oauth block.
   */
  private buildOAuthBlock(
    integration: McpIntegration,
  ): McpIntegrationResponseDto['oauth'] {
    if (
      integration instanceof MarketplaceMcpIntegration ||
      integration instanceof SelfDefinedMcpIntegration
    ) {
      return this.buildSchemaOAuthBlock(integration);
    }

    return undefined;
  }

  private buildSchemaOAuthBlock(
    integration: MarketplaceMcpIntegration | SelfDefinedMcpIntegration,
  ): McpIntegrationResponseDto['oauth'] {
    const oauthConfig = integration.configSchema.oauth;
    if (!oauthConfig) {
      return {
        enabled: false,
        level: null,
        authorized: false,
        hasClientCredentials: !!integration.oauthClientId,
      };
    }

    return {
      enabled: true,
      level: oauthConfig.level,
      authorized: false,
      hasClientCredentials: !!integration.oauthClientId,
    };
  }

  private resolveType(
    integration: McpIntegration,
  ): 'predefined' | 'custom' | 'marketplace' | 'self_defined' {
    switch (integration.kind) {
      case McpIntegrationKind.PREDEFINED:
        return 'predefined';
      case McpIntegrationKind.CUSTOM:
        return 'custom';
      case McpIntegrationKind.MARKETPLACE:
        return 'marketplace';
      case McpIntegrationKind.SELF_DEFINED:
        return 'self_defined';
    }
  }

  /**
   * Gets the auth header name from the integration if applicable.
   * @param integration - The MCP integration entity
   * @returns The auth header name or undefined
   */
  private getAuthHeaderName(
    auth:
      | BearerMcpIntegrationAuth
      | CustomHeaderMcpIntegrationAuth
      | OAuthMcpIntegrationAuth
      | McpIntegration['auth'],
  ): string | undefined {
    if (auth instanceof BearerMcpIntegrationAuth) {
      return auth.getAuthHeaderName();
    }
    if (auth instanceof CustomHeaderMcpIntegrationAuth) {
      return auth.getAuthHeaderName();
    }
    if (auth instanceof OAuthMcpIntegrationAuth) {
      return auth.getAuthHeaderName();
    }
    return undefined;
  }

  /**
   * Builds masked org config values for the response DTO.
   * Non-secret fields include plaintext values.
   * Secret fields are masked with "••••••".
   * Fixed-value fields (those with a `value` in the schema) are excluded.
   */
  private buildMaskedOrgConfigValues(
    orgFields: ConfigField[],
    orgConfigValues: Record<string, string>,
  ): Record<string, string> {
    const masked: Record<string, string> = {};

    for (const field of orgFields) {
      // Skip fixed-value fields — admin didn't provide them
      if (field.value !== undefined) {
        continue;
      }

      if (!(field.key in orgConfigValues)) {
        continue;
      }
      const currentValue = orgConfigValues[field.key];

      if (field.type === 'secret') {
        masked[field.key] = SECRET_MASK;
      } else {
        masked[field.key] = currentValue;
      }
    }

    return masked;
  }

  /**
   * Converts an array of MCP integration entities to DTOs.
   *
   * @param integrations - Array of MCP integration entities
   * @returns Array of DTO representations
   */
  toDtoArray(integrations: McpIntegration[]): McpIntegrationResponseDto[] {
    return integrations.map((integration) => this.toDto(integration));
  }
}
