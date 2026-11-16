import type { AvailableMcpIntegration } from 'src/domain/mcp/application/use-cases/list-available-mcp-integrations/list-available-mcp-integrations.use-case';
import { Injectable } from '@nestjs/common';
import { McpOAuthClientConfigurationService } from 'src/domain/mcp/application/services/mcp-oauth-client-configuration.service';
import { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { SchemaConfiguredMcpIntegration } from 'src/domain/mcp/domain/integrations/schema-configured-mcp-integration.entity';
import { McpIntegrationResponseDto } from 'src/domain/mcp/presenters/http/dto/mcp-integration-response.dto';
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

  async toAvailableDto(
    value: AvailableMcpIntegration,
  ): Promise<McpIntegrationResponseDto> {
    return {
      ...(await this.toDto(value.integration, value.userAuthorized)),
      userConnectionFailure: value.userConnectionFailure,
      userConnectionCheckedAt: value.userConnectionCheckedAt?.toISOString(),
    };
  }

  toDtoArray(
    integrations: McpIntegration[],
  ): Promise<McpIntegrationResponseDto[]> {
    return Promise.all(
      integrations.map((integration) => this.toDto(integration)),
    );
  }
}
