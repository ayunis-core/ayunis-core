import { Injectable } from '@nestjs/common';
import { PredefinedMcpIntegrationConfig } from 'src/domain/mcp/domain/predefined-mcp-integration-config';
import {
  CredentialFieldDto,
  PredefinedConfigResponseDto,
} from '../dto/predefined-config-response.dto';

/**
 * Mapper for converting predefined MCP integration configs to DTOs.
 */
@Injectable()
export class PredefinedConfigDtoMapper {
  /**
   * Converts a predefined MCP integration config to a response DTO.
   * Excludes server URL for security reasons.
   *
   * @param config - The predefined integration config
   * @returns The DTO representation
   */
  toDto(config: PredefinedMcpIntegrationConfig): PredefinedConfigResponseDto {
    const credentialFields: CredentialFieldDto[] =
      config.credentialFields?.map((field) => ({
        label: field.label,
        type: field.type,
        required: field.required,
        help: field.help,
      })) ?? [];
    return {
      slug: config.slug,
      displayName: config.displayName,
      description: config.description,
      authType: config.authType,
      authHeaderName: config.authHeaderName,
      credentialFields,
    };
  }

  /**
   * Converts an array of predefined MCP integration configs to DTOs.
   *
   * @param configs - Array of predefined integration configs
   * @returns Array of DTO representations
   */
  toDtoArray(
    configs: PredefinedMcpIntegrationConfig[],
  ): PredefinedConfigResponseDto[] {
    return configs.map((config) => this.toDto(config));
  }
}
