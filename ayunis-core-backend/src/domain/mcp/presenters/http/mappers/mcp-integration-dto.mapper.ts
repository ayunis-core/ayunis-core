import { Injectable } from '@nestjs/common';
import { McpIntegration } from '../../../domain/mcp-integration.entity';
import { McpIntegrationKind } from '../../../domain/value-objects/mcp-integration-kind.enum';
import { BearerMcpIntegrationAuth } from '../../../domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from '../../../domain/auth/custom-header-mcp-integration-auth.entity';
import { OAuthMcpIntegrationAuth } from '../../../domain/auth/oauth-mcp-integration-auth.entity';
import { McpIntegrationResponseDto } from '../dto/mcp-integration-response.dto';
import { PredefinedMcpIntegration } from 'src/domain/mcp/domain';

/**
 * Mapper for converting MCP integration entities to DTOs.
 */
@Injectable()
export class McpIntegrationDtoMapper {
  /**
   * Converts an MCP integration entity to a response DTO.
   * Handles both predefined and custom integration types.
   * IMPORTANT: Never includes authentication credentials in the response.
   *
   * @param integration - The MCP integration entity
   * @returns The DTO representation
   */
  toDto(integration: McpIntegration): McpIntegrationResponseDto {
    const type =
      integration.kind === McpIntegrationKind.PREDEFINED
        ? 'predefined'
        : 'custom';

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
      hasCredentials,
      connectionStatus: integration.connectionStatus,
      lastConnectionError: integration.lastConnectionError,
      lastConnectionCheck: integration.lastConnectionCheck,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
      returnsPii: integration.returnsPii,
    };

    // Add type-specific fields
    if (integration instanceof PredefinedMcpIntegration) {
      baseDto.slug = integration.slug;
      baseDto.serverUrl = undefined; // Not exposed for predefined
    } else {
      baseDto.slug = undefined;
      baseDto.serverUrl = integration.serverUrl;
    }

    return baseDto;
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
   * Converts an array of MCP integration entities to DTOs.
   *
   * @param integrations - Array of MCP integration entities
   * @returns Array of DTO representations
   */
  toDtoArray(integrations: McpIntegration[]): McpIntegrationResponseDto[] {
    return integrations.map((integration) => this.toDto(integration));
  }
}
