import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiParam,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { UUID } from 'crypto';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

// DTOs
import { CreatePredefinedIntegrationDto } from './dto/create-predefined-integration.dto';
import { CreateCustomIntegrationDto } from './dto/create-custom-integration.dto';
import { CreateSelfDefinedIntegrationDto } from './dto/create-self-defined-integration.dto';
import { UpdateMcpIntegrationDto } from './dto/update-mcp-integration.dto';
import { InstallMarketplaceIntegrationDto } from './dto/install-marketplace-integration.dto';
import { SetUserConfigDto, UserConfigResponseDto } from './dto/user-config.dto';
import { McpIntegrationResponseDto } from './dto/mcp-integration-response.dto';
import { OAuthAuthorizeResponseDto } from './dto/oauth-authorize-response.dto';
import { OAuthStatusResponseDto } from './dto/oauth-status-response.dto';
import { ValidationResponseDto } from './dto/validation-response.dto';
import { PredefinedConfigResponseDto } from './dto/predefined-config-response.dto';

// Mappers
import { McpIntegrationDtoMapper } from './mappers/mcp-integration-dto.mapper';
import { PredefinedConfigDtoMapper } from './mappers/predefined-config-dto.mapper';

// Use Cases
import { CreateMcpIntegrationUseCase } from '../../application/use-cases/create-mcp-integration/create-mcp-integration.use-case';
import { GetMcpIntegrationUseCase } from '../../application/use-cases/get-mcp-integration/get-mcp-integration.use-case';
import { ListOrgMcpIntegrationsUseCase } from '../../application/use-cases/list-org-mcp-integrations/list-org-mcp-integrations.use-case';
import { ListAvailableMcpIntegrationsUseCase } from '../../application/use-cases/list-available-mcp-integrations/list-available-mcp-integrations.use-case';
import { UpdateMcpIntegrationUseCase } from '../../application/use-cases/update-mcp-integration/update-mcp-integration.use-case';
import { DeleteMcpIntegrationUseCase } from '../../application/use-cases/delete-mcp-integration/delete-mcp-integration.use-case';
import { EnableMcpIntegrationUseCase } from '../../application/use-cases/enable-mcp-integration/enable-mcp-integration.use-case';
import { DisableMcpIntegrationUseCase } from '../../application/use-cases/disable-mcp-integration/disable-mcp-integration.use-case';
import { ValidateMcpIntegrationUseCase } from '../../application/use-cases/validate-mcp-integration/validate-mcp-integration.use-case';
import { ListPredefinedMcpIntegrationConfigsUseCase } from '../../application/use-cases/list-predefined-mcp-integration-configs/list-predefined-mcp-integration-configs.use-case';
import { InstallMarketplaceIntegrationUseCase } from '../../application/use-cases/install-marketplace-integration/install-marketplace-integration.use-case';
import { SetUserMcpConfigUseCase } from '../../application/use-cases/set-user-mcp-config/set-user-mcp-config.use-case';
import { GetUserMcpConfigUseCase } from '../../application/use-cases/get-user-mcp-config/get-user-mcp-config.use-case';

// Commands and Queries
import { CreatePredefinedMcpIntegrationCommand } from '../../application/use-cases/create-mcp-integration/create-predefined-mcp-integration.command';
import { CreateCustomMcpIntegrationCommand } from '../../application/use-cases/create-mcp-integration/create-custom-mcp-integration.command';
import { GetMcpIntegrationQuery } from '../../application/use-cases/get-mcp-integration/get-mcp-integration.query';
import { UpdateMcpIntegrationCommand } from '../../application/use-cases/update-mcp-integration/update-mcp-integration.command';
import { DeleteMcpIntegrationCommand } from '../../application/use-cases/delete-mcp-integration/delete-mcp-integration.command';
import { EnableMcpIntegrationCommand } from '../../application/use-cases/enable-mcp-integration/enable-mcp-integration.command';
import { DisableMcpIntegrationCommand } from '../../application/use-cases/disable-mcp-integration/disable-mcp-integration.command';
import { ValidateMcpIntegrationCommand } from '../../application/use-cases/validate-mcp-integration/validate-mcp-integration.command';
import { InstallMarketplaceIntegrationCommand } from '../../application/use-cases/install-marketplace-integration/install-marketplace-integration.command';
import { SetUserMcpConfigCommand } from '../../application/use-cases/set-user-mcp-config/set-user-mcp-config.command';
import { GetUserMcpConfigQuery } from '../../application/use-cases/get-user-mcp-config/get-user-mcp-config.query';
import { CreateSelfDefinedMcpIntegrationCommand } from '../../application/use-cases/create-self-defined-mcp-integration/create-self-defined-mcp-integration.command';
import { StartMcpOAuthAuthorizationCommand } from '../../application/use-cases/start-mcp-oauth-authorization/start-mcp-oauth-authorization.command';
import { CompleteMcpOAuthAuthorizationCommand } from '../../application/use-cases/complete-mcp-oauth-authorization/complete-mcp-oauth-authorization.command';
import { RevokeMcpOAuthAuthorizationCommand } from '../../application/use-cases/revoke-mcp-oauth-authorization/revoke-mcp-oauth-authorization.command';
import { GetMcpOAuthAuthorizationStatusQuery } from '../../application/use-cases/get-mcp-oauth-authorization-status/get-mcp-oauth-authorization-status.query';
import { CreateSelfDefinedMcpIntegrationUseCase } from '../../application/use-cases/create-self-defined-mcp-integration/create-self-defined-mcp-integration.use-case';
import { StartMcpOAuthAuthorizationUseCase } from '../../application/use-cases/start-mcp-oauth-authorization/start-mcp-oauth-authorization.use-case';
import { CompleteMcpOAuthAuthorizationUseCase } from '../../application/use-cases/complete-mcp-oauth-authorization/complete-mcp-oauth-authorization.use-case';
import { RevokeMcpOAuthAuthorizationUseCase } from '../../application/use-cases/revoke-mcp-oauth-authorization/revoke-mcp-oauth-authorization.use-case';
import { GetMcpOAuthAuthorizationStatusUseCase } from '../../application/use-cases/get-mcp-oauth-authorization-status/get-mcp-oauth-authorization-status.use-case';
import { McpIntegration } from '../../domain/mcp-integration.entity';
import { MarketplaceMcpIntegration } from '../../domain/integrations/marketplace-mcp-integration.entity';
import { SelfDefinedMcpIntegration } from '../../domain/integrations/self-defined-mcp-integration.entity';
import { CredentialFieldValue } from '../../domain/predefined-mcp-integration-config';
import { ConfigService } from '@nestjs/config';
import { Public } from 'src/common/guards/public.guard';
import type { IntegrationConfigSchema } from '../../domain/value-objects/integration-config-schema';

@ApiTags('mcp-integrations')
@Controller('mcp-integrations')
export class McpIntegrationsController {
  private readonly logger = new Logger(McpIntegrationsController.name);

  constructor(
    private readonly createMcpIntegrationUseCase: CreateMcpIntegrationUseCase,
    private readonly getMcpIntegrationUseCase: GetMcpIntegrationUseCase,
    private readonly listOrgMcpIntegrationsUseCase: ListOrgMcpIntegrationsUseCase,
    private readonly listAvailableMcpIntegrationsUseCase: ListAvailableMcpIntegrationsUseCase,
    private readonly updateMcpIntegrationUseCase: UpdateMcpIntegrationUseCase,
    private readonly deleteMcpIntegrationUseCase: DeleteMcpIntegrationUseCase,
    private readonly enableMcpIntegrationUseCase: EnableMcpIntegrationUseCase,
    private readonly disableMcpIntegrationUseCase: DisableMcpIntegrationUseCase,
    private readonly validateMcpIntegrationUseCase: ValidateMcpIntegrationUseCase,
    private readonly listPredefinedConfigsUseCase: ListPredefinedMcpIntegrationConfigsUseCase,
    private readonly installMarketplaceIntegrationUseCase: InstallMarketplaceIntegrationUseCase,
    private readonly setUserMcpConfigUseCase: SetUserMcpConfigUseCase,
    private readonly getUserMcpConfigUseCase: GetUserMcpConfigUseCase,
    private readonly createSelfDefinedUseCase: CreateSelfDefinedMcpIntegrationUseCase,
    private readonly startOAuthUseCase: StartMcpOAuthAuthorizationUseCase,
    private readonly completeOAuthUseCase: CompleteMcpOAuthAuthorizationUseCase,
    private readonly revokeOAuthUseCase: RevokeMcpOAuthAuthorizationUseCase,
    private readonly getOAuthStatusUseCase: GetMcpOAuthAuthorizationStatusUseCase,
    private readonly mcpIntegrationDtoMapper: McpIntegrationDtoMapper,
    private readonly predefinedConfigDtoMapper: PredefinedConfigDtoMapper,
    private readonly configService: ConfigService,
  ) {}

  @Post('predefined')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new predefined MCP integration' })
  @ApiBody({ type: CreatePredefinedIntegrationDto })
  @ApiResponse({ status: 201, type: McpIntegrationResponseDto })
  async createPredefined(
    @Body() dto: CreatePredefinedIntegrationDto,
  ): Promise<McpIntegrationResponseDto> {
    this.logger.log('createPredefined', { slug: dto.slug });
    const credentialFields: CredentialFieldValue[] = dto.configValues.map(
      (cv) => ({ name: cv.name, value: cv.value }),
    );
    const command = new CreatePredefinedMcpIntegrationCommand(
      dto.slug,
      credentialFields,
      dto.returnsPii,
    );
    const integration = await this.createMcpIntegrationUseCase.execute(command);
    return this.mcpIntegrationDtoMapper.toDto(integration);
  }

  @Post('custom')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new custom MCP integration' })
  @ApiBody({ type: CreateCustomIntegrationDto })
  @ApiResponse({ status: 201, type: McpIntegrationResponseDto })
  async createCustom(
    @Body() dto: CreateCustomIntegrationDto,
  ): Promise<McpIntegrationResponseDto> {
    this.logger.log('createCustom', { name: dto.name });
    const isCloud =
      this.configService.get<boolean>('app.isCloudHosted') ?? false;
    if (isCloud) {
      throw new ForbiddenException(
        'Custom MCP integrations are not allowed on cloud',
      );
    }
    const command = new CreateCustomMcpIntegrationCommand(
      dto.name,
      dto.serverUrl,
      dto.authMethod,
      dto.authHeaderName,
      dto.credentials,
      dto.returnsPii,
    );
    const integration = await this.createMcpIntegrationUseCase.execute(command);
    return this.mcpIntegrationDtoMapper.toDto(integration);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all MCP integrations for organization' })
  @ApiResponse({ status: 200, type: [McpIntegrationResponseDto] })
  async list(): Promise<McpIntegrationResponseDto[]> {
    const integrations = await this.listOrgMcpIntegrationsUseCase.execute();
    const dtos = this.mcpIntegrationDtoMapper.toDtoArray(integrations);
    return this.enrichWithOAuthStatus(dtos, integrations);
  }

  @Get('predefined/available')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'List available predefined MCP integration configurations',
  })
  @ApiResponse({ status: 200, type: [PredefinedConfigResponseDto] })
  listPredefinedConfigs(): PredefinedConfigResponseDto[] {
    const configs = this.listPredefinedConfigsUseCase.execute();
    return this.predefinedConfigDtoMapper.toDtoArray(configs);
  }

  @Get('available')
  @ApiOperation({ summary: 'List available (enabled) MCP integrations' })
  @ApiResponse({ status: 200, type: [McpIntegrationResponseDto] })
  async listAvailable(): Promise<McpIntegrationResponseDto[]> {
    const integrations =
      await this.listAvailableMcpIntegrationsUseCase.execute();
    const dtos = this.mcpIntegrationDtoMapper.toDtoArray(integrations);
    return this.enrichWithOAuthStatus(dtos, integrations);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get MCP integration by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: McpIntegrationResponseDto })
  async getById(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<McpIntegrationResponseDto> {
    const integration = await this.getMcpIntegrationUseCase.execute(
      new GetMcpIntegrationQuery(id),
    );
    const dto = this.mcpIntegrationDtoMapper.toDto(integration);
    const [enriched] = await this.enrichWithOAuthStatus([dto], [integration]);
    return enriched;
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update MCP integration' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({ type: UpdateMcpIntegrationDto })
  @ApiResponse({ status: 200, type: McpIntegrationResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: UpdateMcpIntegrationDto,
  ): Promise<McpIntegrationResponseDto> {
    const command = new UpdateMcpIntegrationCommand({
      integrationId: id,
      name: dto.name,
      credentials: dto.credentials,
      authHeaderName: dto.authHeaderName,
      returnsPii: dto.returnsPii,
      orgConfigValues: dto.orgConfigValues,
      oauthClientId: dto.oauthClientId,
      oauthClientSecret: dto.oauthClientSecret,
      configSchema: dto.configSchema as IntegrationConfigSchema | undefined,
    });
    const integration = await this.updateMcpIntegrationUseCase.execute(command);
    return this.mcpIntegrationDtoMapper.toDto(integration);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete MCP integration' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204 })
  async delete(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    await this.deleteMcpIntegrationUseCase.execute(
      new DeleteMcpIntegrationCommand(id),
    );
  }

  @Post(':id/enable')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Enable MCP integration' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: McpIntegrationResponseDto })
  async enable(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<McpIntegrationResponseDto> {
    const integration = await this.enableMcpIntegrationUseCase.execute(
      new EnableMcpIntegrationCommand(id),
    );
    return this.mcpIntegrationDtoMapper.toDto(integration);
  }

  @Post(':id/disable')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Disable MCP integration' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: McpIntegrationResponseDto })
  async disable(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<McpIntegrationResponseDto> {
    const integration = await this.disableMcpIntegrationUseCase.execute(
      new DisableMcpIntegrationCommand(id),
    );
    return this.mcpIntegrationDtoMapper.toDto(integration);
  }

  @Post('install-from-marketplace')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Install an MCP integration from the marketplace' })
  @ApiBody({ type: InstallMarketplaceIntegrationDto })
  @ApiResponse({ status: 201, type: McpIntegrationResponseDto })
  async installFromMarketplace(
    @Body() dto: InstallMarketplaceIntegrationDto,
  ): Promise<McpIntegrationResponseDto> {
    const command = new InstallMarketplaceIntegrationCommand(
      dto.identifier,
      dto.orgConfigValues,
      dto.returnsPii,
      dto.oauthClientId,
      dto.oauthClientSecret,
    );
    const integration =
      await this.installMarketplaceIntegrationUseCase.execute(command);
    return this.mcpIntegrationDtoMapper.toDto(integration);
  }

  @Get(':id/user-config')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user config for an MCP integration' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: UserConfigResponseDto })
  async getUserConfig(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<UserConfigResponseDto> {
    const result = await this.getUserMcpConfigUseCase.execute(
      new GetUserMcpConfigQuery(id),
    );
    return { hasConfig: result.hasConfig, configValues: result.configValues };
  }

  @Patch(':id/user-config')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Set user config for an MCP integration' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({ type: SetUserConfigDto })
  @ApiResponse({ status: 200, type: UserConfigResponseDto })
  async setUserConfig(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: SetUserConfigDto,
  ): Promise<UserConfigResponseDto> {
    return this.setUserMcpConfigUseCase.execute(
      new SetUserMcpConfigCommand(id, dto.configValues),
    );
  }

  @Post(':id/validate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Validate MCP integration connection' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: ValidationResponseDto })
  async validate(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<ValidationResponseDto> {
    const result = await this.validateMcpIntegrationUseCase.execute(
      new ValidateMcpIntegrationCommand(id),
    );
    return {
      valid: result.isValid,
      capabilities: {
        tools: result.toolCount ?? 0,
        resources: result.resourceCount ?? 0,
        prompts: result.promptCount ?? 0,
      },
      error: result.errorMessage,
    };
  }

  @Post('self-defined')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a self-defined MCP integration' })
  @ApiBody({ type: CreateSelfDefinedIntegrationDto })
  @ApiResponse({ status: 201, type: McpIntegrationResponseDto })
  async createSelfDefined(
    @Body() dto: CreateSelfDefinedIntegrationDto,
  ): Promise<McpIntegrationResponseDto> {
    this.logger.log('createSelfDefined', { name: dto.name });
    const isCloud =
      this.configService.get<boolean>('app.isCloudHosted') ?? false;
    if (isCloud) {
      throw new ForbiddenException(
        'Self-defined MCP integrations are not allowed on cloud',
      );
    }
    const command = new CreateSelfDefinedMcpIntegrationCommand(
      dto.name,
      dto.serverUrl,
      dto.configSchema as IntegrationConfigSchema,
      dto.orgConfigValues,
      dto.description,
      dto.oauthClientId,
      dto.oauthClientSecret,
      dto.returnsPii,
    );
    const integration = await this.createSelfDefinedUseCase.execute(command);
    return this.mcpIntegrationDtoMapper.toDto(integration);
  }

  @Post(':id/oauth/authorize')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start OAuth authorization for an integration' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: OAuthAuthorizeResponseDto })
  async startOAuthAuthorize(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<OAuthAuthorizeResponseDto> {
    const result = await this.startOAuthUseCase.execute(
      new StartMcpOAuthAuthorizationCommand(id),
    );
    return { authorizationUrl: result.authorizationUrl };
  }

  @Get('oauth/callback')
  @Public()
  @ApiExcludeEndpoint()
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const frontendBaseUrl = this.configService.getOrThrow<string>(
      'app.frontend.baseUrl',
    );

    if (error) {
      const reason = error === 'access_denied' ? 'User denied consent' : error;
      res.redirect(
        `${frontendBaseUrl}/admin-settings/integrations?oauth=error&reason=${encodeURIComponent(reason)}`,
      );
      return;
    }

    const result = await this.completeOAuthUseCase.execute(
      new CompleteMcpOAuthAuthorizationCommand(code, state),
    );
    if (result.success) {
      res.redirect(
        `${frontendBaseUrl}/admin-settings/integrations?oauth=success&id=${result.integrationId}`,
      );
    } else {
      res.redirect(
        `${frontendBaseUrl}/admin-settings/integrations?oauth=error&reason=${encodeURIComponent(result.reason)}`,
      );
    }
  }

  @Post(':id/oauth/revoke')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke OAuth authorization for an integration' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204 })
  async revokeOAuth(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    await this.revokeOAuthUseCase.execute(
      new RevokeMcpOAuthAuthorizationCommand(id),
    );
  }

  @Get(':id/oauth/status')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get OAuth authorization status for an integration',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: OAuthStatusResponseDto })
  async getOAuthStatus(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<OAuthStatusResponseDto> {
    return this.getOAuthStatusUseCase.execute(
      new GetMcpOAuthAuthorizationStatusQuery(id),
    );
  }

  /**
   * Enriches DTO array with OAuth authorized status by batch-loading tokens.
   * The mapper sets `oauth.authorized = false` by default; this method
   * updates it to `true` when a token row exists for the integration.
   */
  private async enrichWithOAuthStatus(
    dtos: McpIntegrationResponseDto[],
    integrations: McpIntegration[],
  ): Promise<McpIntegrationResponseDto[]> {
    const oauthIntegrations = integrations.filter(
      (i): i is MarketplaceMcpIntegration | SelfDefinedMcpIntegration =>
        i instanceof MarketplaceMcpIntegration ||
        i instanceof SelfDefinedMcpIntegration,
    );

    const oauthEnabled = oauthIntegrations.filter((i) => i.configSchema.oauth);

    if (oauthEnabled.length === 0) return dtos;

    const authorizedByIntegrationId = new Map<UUID, boolean>(
      await Promise.all(
        oauthEnabled.map(async (integration) => {
          try {
            const status = await this.getOAuthStatusUseCase.execute(
              new GetMcpOAuthAuthorizationStatusQuery(integration.id),
            );
            return [integration.id, status.authorized] as const;
          } catch (error) {
            this.logger.warn(
              `Failed to fetch OAuth status for integration ${integration.id}`,
              error instanceof Error ? error.message : String(error),
            );
            return [integration.id, false] as const;
          }
        }),
      ),
    );

    integrations.forEach((integration, index) => {
      const dto = dtos[index];
      if (!dto.oauth?.enabled) {
        return;
      }
      dto.oauth.authorized =
        authorizedByIntegrationId.get(integration.id) ?? false;
    });

    return dtos;
  }
}
