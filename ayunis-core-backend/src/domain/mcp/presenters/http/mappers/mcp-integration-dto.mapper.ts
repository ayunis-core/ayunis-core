import { Injectable } from '@nestjs/common';
import {
  McpIntegration,
  PredefinedMcpIntegration,
  CustomMcpIntegration,
} from '../../../domain/mcp-integration.entity';
import { McpIntegrationResponseDto } from '../dto/mcp-integration-response.dto';

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
    const baseDto: McpIntegrationResponseDto = {
      id: integration.id,
      name: integration.name,
      type: integration.type,
      enabled: integration.enabled,
      organizationId: integration.organizationId,
      authMethod: integration.authMethod,
      authHeaderName: integration.authHeaderName,
      hasCredentials: !!integration.encryptedCredentials,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    };

    // Add type-specific fields
    if (integration instanceof PredefinedMcpIntegration) {
      baseDto.slug = integration.slug;
      baseDto.serverUrl = undefined; // Not exposed for predefined
    } else if (integration instanceof CustomMcpIntegration) {
      baseDto.slug = undefined;
      baseDto.serverUrl = integration.serverUrl;
    }

    return baseDto;
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
