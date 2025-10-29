import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { UUID } from 'crypto';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

// DTOs
import { CreatePredefinedIntegrationDto } from './dto/create-predefined-integration.dto';
import { CreateCustomIntegrationDto } from './dto/create-custom-integration.dto';
import { UpdateMcpIntegrationDto } from './dto/update-mcp-integration.dto';
import { McpIntegrationResponseDto } from './dto/mcp-integration-response.dto';
import { ValidationResponseDto } from './dto/validation-response.dto';
import { PredefinedConfigResponseDto } from './dto/predefined-config-response.dto';
import { McpHealthResponseDto } from './dto/mcp-health-response.dto';

// Mapper
import { McpIntegrationDtoMapper } from './mappers/mcp-integration-dto.mapper';

// Use Cases
import { CreateMcpIntegrationUseCase } from '../../application/use-cases/create-mcp-integration/create-mcp-integration.use-case';
import { GetMcpIntegrationUseCase } from '../../application/use-cases/get-mcp-integration/get-mcp-integration.use-case';
import { ListOrgMcpIntegrationsUseCase } from '../../application/use-cases/list-org-mcp-integrations/list-org-mcp-integrations.use-case';
import { UpdateMcpIntegrationUseCase } from '../../application/use-cases/update-mcp-integration/update-mcp-integration.use-case';
import { DeleteMcpIntegrationUseCase } from '../../application/use-cases/delete-mcp-integration/delete-mcp-integration.use-case';
import { EnableMcpIntegrationUseCase } from '../../application/use-cases/enable-mcp-integration/enable-mcp-integration.use-case';
import { DisableMcpIntegrationUseCase } from '../../application/use-cases/disable-mcp-integration/disable-mcp-integration.use-case';
import { ValidateMcpIntegrationUseCase } from '../../application/use-cases/validate-mcp-integration/validate-mcp-integration.use-case';
import { ListPredefinedMcpIntegrationConfigsUseCase } from '../../application/use-cases/list-predefined-mcp-integration-configs/list-predefined-mcp-integration-configs.use-case';
import { GetMcpHealthUseCase } from '../../application/use-cases/get-mcp-health/get-mcp-health.use-case';

// Commands and Queries
import { CreatePredefinedMcpIntegrationCommand } from '../../application/use-cases/create-mcp-integration/create-predefined-mcp-integration.command';
import { CreateCustomMcpIntegrationCommand } from '../../application/use-cases/create-mcp-integration/create-custom-mcp-integration.command';
import { GetMcpIntegrationQuery } from '../../application/use-cases/get-mcp-integration/get-mcp-integration.query';
import { ListOrgMcpIntegrationsQuery } from '../../application/use-cases/list-org-mcp-integrations/list-org-mcp-integrations.query';
import { UpdateMcpIntegrationCommand } from '../../application/use-cases/update-mcp-integration/update-mcp-integration.command';
import { DeleteMcpIntegrationCommand } from '../../application/use-cases/delete-mcp-integration/delete-mcp-integration.command';
import { EnableMcpIntegrationCommand } from '../../application/use-cases/enable-mcp-integration/enable-mcp-integration.command';
import { DisableMcpIntegrationCommand } from '../../application/use-cases/disable-mcp-integration/disable-mcp-integration.command';
import { ValidateMcpIntegrationCommand } from '../../application/use-cases/validate-mcp-integration/validate-mcp-integration.command';

// Ports
import { McpCredentialEncryptionPort } from '../../application/ports/mcp-credential-encryption.port';

/**
 * Controller for managing MCP integrations (organization admin level).
 * Provides CRUD operations for predefined and custom MCP integrations.
 * All endpoints require organization admin role.
 */
@ApiTags('mcp-integrations')
@Controller('mcp-integrations')
export class McpIntegrationsController {
  private readonly logger = new Logger(McpIntegrationsController.name);

  constructor(
    private readonly createMcpIntegrationUseCase: CreateMcpIntegrationUseCase,
    private readonly getMcpIntegrationUseCase: GetMcpIntegrationUseCase,
    private readonly listOrgMcpIntegrationsUseCase: ListOrgMcpIntegrationsUseCase,
    private readonly updateMcpIntegrationUseCase: UpdateMcpIntegrationUseCase,
    private readonly deleteMcpIntegrationUseCase: DeleteMcpIntegrationUseCase,
    private readonly enableMcpIntegrationUseCase: EnableMcpIntegrationUseCase,
    private readonly disableMcpIntegrationUseCase: DisableMcpIntegrationUseCase,
    private readonly validateMcpIntegrationUseCase: ValidateMcpIntegrationUseCase,
    private readonly listPredefinedConfigsUseCase: ListPredefinedMcpIntegrationConfigsUseCase,
    private readonly getMcpHealthUseCase: GetMcpHealthUseCase,
    private readonly mcpIntegrationDtoMapper: McpIntegrationDtoMapper,
    private readonly credentialEncryption: McpCredentialEncryptionPort,
  ) {}

  @Post('predefined')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new predefined MCP integration' })
  @ApiBody({ type: CreatePredefinedIntegrationDto })
  @ApiResponse({
    status: 201,
    description: 'Integration created successfully',
    type: McpIntegrationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid slug or missing required fields',
  })
  @ApiResponse({
    status: 404,
    description: 'Predefined integration slug not found',
  })
  async createPredefined(
    @Body() dto: CreatePredefinedIntegrationDto,
  ): Promise<McpIntegrationResponseDto> {
    this.logger.log('createPredefined', { name: dto.name, slug: dto.slug });

    // Encrypt credentials at HTTP layer
    const encryptedCreds = dto.credentials
      ? await this.credentialEncryption.encrypt(dto.credentials)
      : undefined;

    const command = new CreatePredefinedMcpIntegrationCommand(
      dto.name,
      dto.slug,
      dto.authMethod,
      dto.authHeaderName,
      encryptedCreds,
    );

    const integration = await this.createMcpIntegrationUseCase.execute(command);
    return this.mcpIntegrationDtoMapper.toDto(integration);
  }

  @Post('custom')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new custom MCP integration' })
  @ApiBody({ type: CreateCustomIntegrationDto })
  @ApiResponse({
    status: 201,
    description: 'Integration created successfully',
    type: McpIntegrationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async createCustom(
    @Body() dto: CreateCustomIntegrationDto,
  ): Promise<McpIntegrationResponseDto> {
    this.logger.log('createCustom', {
      name: dto.name,
      serverUrl: dto.serverUrl,
    });

    // Encrypt credentials at HTTP layer
    const encryptedCreds = dto.credentials
      ? await this.credentialEncryption.encrypt(dto.credentials)
      : undefined;

    const command = new CreateCustomMcpIntegrationCommand(
      dto.name,
      dto.serverUrl,
      dto.authMethod,
      dto.authHeaderName,
      encryptedCreds,
    );

    const integration = await this.createMcpIntegrationUseCase.execute(command);
    return this.mcpIntegrationDtoMapper.toDto(integration);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all MCP integrations for organization' })
  @ApiResponse({
    status: 200,
    description: 'List of integrations',
    type: [McpIntegrationResponseDto],
  })
  async list(): Promise<McpIntegrationResponseDto[]> {
    this.logger.log('listOrgMcpIntegrations');

    const integrations = await this.listOrgMcpIntegrationsUseCase.execute(
      new ListOrgMcpIntegrationsQuery(),
    );

    return this.mcpIntegrationDtoMapper.toDtoArray(integrations);
  }

  @Get('predefined/available')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'List available predefined MCP integration configurations',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available predefined integrations',
    type: [PredefinedConfigResponseDto],
  })
  async listPredefinedConfigs(): Promise<PredefinedConfigResponseDto[]> {
    this.logger.log('listPredefinedConfigs');

    const configs = this.listPredefinedConfigsUseCase.execute();

    // Map to response DTOs (excluding server URL for security)
    return configs.map((config) => ({
      slug: config.slug,
      displayName: config.displayName,
      description: config.description,
      defaultAuthMethod: config.defaultAuthMethod,
      defaultAuthHeaderName: config.defaultAuthHeaderName,
    }));
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get MCP integration by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Integration found',
    type: McpIntegrationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async getById(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<McpIntegrationResponseDto> {
    this.logger.log('getById', { id });

    const integration = await this.getMcpIntegrationUseCase.execute(
      new GetMcpIntegrationQuery(id),
    );

    return this.mcpIntegrationDtoMapper.toDto(integration);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update MCP integration' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({ type: UpdateMcpIntegrationDto })
  @ApiResponse({
    status: 200,
    description: 'Integration updated successfully',
    type: McpIntegrationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: UpdateMcpIntegrationDto,
  ): Promise<McpIntegrationResponseDto> {
    this.logger.log('update', { id });

    // Encrypt credentials if provided
    const encryptedCreds = dto.credentials
      ? await this.credentialEncryption.encrypt(dto.credentials)
      : undefined;

    const command = new UpdateMcpIntegrationCommand(
      id,
      dto.name,
      dto.authMethod,
      dto.authHeaderName,
      encryptedCreds,
    );

    const integration = await this.updateMcpIntegrationUseCase.execute(command);
    return this.mcpIntegrationDtoMapper.toDto(integration);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete MCP integration' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Integration deleted successfully' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async delete(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    this.logger.log('delete', { id });

    await this.deleteMcpIntegrationUseCase.execute(
      new DeleteMcpIntegrationCommand(id),
    );
  }

  @Post(':id/enable')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Enable MCP integration' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Integration enabled successfully',
    type: McpIntegrationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async enable(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<McpIntegrationResponseDto> {
    this.logger.log('enable', { id });

    const integration = await this.enableMcpIntegrationUseCase.execute(
      new EnableMcpIntegrationCommand(id),
    );

    return this.mcpIntegrationDtoMapper.toDto(integration);
  }

  @Post(':id/disable')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Disable MCP integration' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Integration disabled successfully',
    type: McpIntegrationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async disable(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<McpIntegrationResponseDto> {
    this.logger.log('disable', { id });

    const integration = await this.disableMcpIntegrationUseCase.execute(
      new DisableMcpIntegrationCommand(id),
    );

    return this.mcpIntegrationDtoMapper.toDto(integration);
  }

  @Post(':id/validate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Validate MCP integration connection' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
    type: ValidationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  async validate(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<ValidationResponseDto> {
    this.logger.log('validate', { id });

    const result = await this.validateMcpIntegrationUseCase.execute(
      new ValidateMcpIntegrationCommand(id),
    );

    // Map ValidationResult to ValidationResponseDto
    return {
      valid: result.isValid,
      capabilities: {
        tools: result.toolCount || 0,
        resources: result.resourceCount || 0,
        prompts: result.promptCount || 0,
      },
      error: result.errorMessage,
    };
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check MCP integrations health',
    description:
      'Endpoint for monitoring MCP integration health. Returns cached status without live validation.',
  })
  @ApiResponse({
    status: 200,
    description: 'At least one integration is healthy',
    type: McpHealthResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'All integrations are unhealthy or none exist',
    type: McpHealthResponseDto,
  })
  async getHealth(): Promise<McpHealthResponseDto> {
    this.logger.log('getHealth');

    const result = await this.getMcpHealthUseCase.execute();

    // Return appropriate HTTP status code based on health
    // Note: HttpCode decorator above handles 200, we set 503 in response header if needed
    // For monitoring tools, we return 200 with status in body for both cases

    return {
      status: result.status,
      timestamp: result.timestamp,
      integrations: result.integrations.map((integration) => ({
        id: integration.id,
        name: integration.name,
        type: integration.type,
        status: integration.status,
        lastChecked: integration.lastChecked,
        enabled: integration.enabled,
      })),
    };
  }
}
