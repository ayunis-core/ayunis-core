import { Injectable } from '@nestjs/common';
import { McpOAuthClientConfigurationService } from '../../../application/services/mcp-oauth-client-configuration.service';
import { McpIntegration } from '../../../domain/mcp-integration.entity';
import { SchemaConfiguredMcpIntegration } from '../../../domain/integrations/schema-configured-mcp-integration.entity';
import { McpIntegrationResponseDto } from '../dto/mcp-integration-response.dto';
import { McpIntegrationDtoMapper } from './mcp-integration-dto.mapper';

@Injectable()
export class McpIntegrationResponseMapper {
  constructor(
    private readonly dtoMapper: McpIntegrationDtoMapper,
    private readonly oauthClientConfiguration: McpOAuthClientConfigurationService,
  ) {}

  async toDto(
    integration: McpIntegration,
    userAuthorized?: boolean,
  ): Promise<McpIntegrationResponseDto> {
    const configured =
      integration instanceof SchemaConfiguredMcpIntegration
        ? await this.oauthClientConfiguration.isStaticClientConfigured(
            integration,
          )
        : undefined;
    return this.dtoMapper.toDto(integration, userAuthorized, configured);
  }

  toDtoArray(
    integrations: McpIntegration[],
  ): Promise<McpIntegrationResponseDto[]> {
    return Promise.all(
      integrations.map((integration) => this.toDto(integration)),
    );
  }
}
