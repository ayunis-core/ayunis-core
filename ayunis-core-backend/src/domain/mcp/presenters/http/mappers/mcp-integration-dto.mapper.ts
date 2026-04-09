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
    const type = this.resolveType(integration);

    const auth = integration.auth;
    const hasCredentials = auth.hasCredentials();

    const baseDto: McpIntegrationResponseDto = {
      id: integration.id,
      name: integration.name,
      type,
      enabled: integration.enabled,
      organizationId: integration.orgId,
      authMethod: integration.getAuthType(),
      authHeaderName: this.getAuthHeaderName(auth),
      hasCredentials: hasCredentials,
      connectionStatus: integration.connectionStatus,
      lastConnectionError: integration.lastConnectionError,
      lastConnectionCheck: integration.lastConnectionCheck,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
      returnsPii: integration.returnsPii,
      description: integration.description,
    };

    // Add type-specific fields
    if (integration instanceof MarketplaceMcpIntegration) {
      baseDto.marketplaceIdentifier = integration.marketplaceIdentifier;
      baseDto.configSchema = {
        authType: integration.configSchema.authType,
        orgFields: integration.configSchema.orgFields,
        userFields: integration.configSchema.userFields,
      };
      baseDto.hasUserFields = integration.configSchema.userFields.length > 0;
      baseDto.orgConfigValues = this.buildMaskedOrgConfigValues(
        integration.configSchema.orgFields,
        integration.orgConfigValues,
      );
      baseDto.logoUrl = integration.logoUrl;
      baseDto.serverUrl = undefined; // Not exposed for marketplace
      baseDto.slug = undefined;
    } else if (integration instanceof SelfDefinedMcpIntegration) {
      baseDto.configSchema = {
        authType: integration.configSchema.authType,
        orgFields: integration.configSchema.orgFields,
        userFields: integration.configSchema.userFields,
      };
      baseDto.hasUserFields = integration.configSchema.userFields.length > 0;
      baseDto.orgConfigValues = this.buildMaskedOrgConfigValues(
        integration.configSchema.orgFields,
        integration.orgConfigValues,
      );
      baseDto.serverUrl = integration.serverUrl;
      baseDto.slug = undefined;
    } else if (integration instanceof PredefinedMcpIntegration) {
      baseDto.slug = integration.slug;
      baseDto.serverUrl = undefined; // Not exposed for predefined
    } else {
      baseDto.slug = undefined;
      baseDto.serverUrl = integration.serverUrl;
    }

    // Populate OAuth block for integrations with configSchema
    baseDto.oauth = this.buildOAuthBlock(integration);

    return baseDto;
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
   * Builds the OAuth status block for the response DTO.
   * Returns undefined for integrations without a configSchema oauth block.
   */
  private buildOAuthBlock(
    integration: McpIntegration,
  ): McpIntegrationResponseDto['oauth'] {
    const hasSchema =
      integration instanceof MarketplaceMcpIntegration ||
      integration instanceof SelfDefinedMcpIntegration;
    if (!hasSchema) {
      return undefined;
    }

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
      authorized: false, // Enriched by the controller with actual token status
      hasClientCredentials: !!integration.oauthClientId,
    };
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

      const currentValue = orgConfigValues[field.key];
      if (currentValue === undefined) {
        continue;
      }

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
