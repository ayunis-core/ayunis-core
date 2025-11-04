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
  ForbiddenException,
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
import { CredentialFieldValue } from '../../domain/predefined-mcp-integration-config';
import { ConfigService } from '@nestjs/config';

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
    private readonly listAvailableMcpIntegrationsUseCase: ListAvailableMcpIntegrationsUseCase,
    private readonly updateMcpIntegrationUseCase: UpdateMcpIntegrationUseCase,
    private readonly deleteMcpIntegrationUseCase: DeleteMcpIntegrationUseCase,
    private readonly enableMcpIntegrationUseCase: EnableMcpIntegrationUseCase,
    private readonly disableMcpIntegrationUseCase: DisableMcpIntegrationUseCase,
    private readonly validateMcpIntegrationUseCase: ValidateMcpIntegrationUseCase,
    private readonly listPredefinedConfigsUseCase: ListPredefinedMcpIntegrationConfigsUseCase,
    private readonly mcpIntegrationDtoMapper: McpIntegrationDtoMapper,
    private readonly predefinedConfigDtoMapper: PredefinedConfigDtoMapper,
    private readonly configService: ConfigService,
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
    this.logger.log('createPredefined', { slug: dto.slug });

    // Map DTO config values to domain credential fields
    const credentialFields: CredentialFieldValue[] = dto.configValues.map(
      (cv) => ({
        name: cv.name,
        value: cv.value,
      }),
    );

    const command = new CreatePredefinedMcpIntegrationCommand(
      dto.slug,
      credentialFields,
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
  listPredefinedConfigs(): PredefinedConfigResponseDto[] {
    this.logger.log('listPredefinedConfigs');

    const configs = this.listPredefinedConfigsUseCase.execute();

    return this.predefinedConfigDtoMapper.toDtoArray(configs);
  }

  @Get('available')
  @ApiOperation({
    summary: 'List all available (enabled) MCP integrations for organization',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available enabled integrations',
    type: [McpIntegrationResponseDto],
  })
  async listAvailable(): Promise<McpIntegrationResponseDto[]> {
    this.logger.log('listAvailableMcpIntegrations');

    const integrations =
      await this.listAvailableMcpIntegrationsUseCase.execute();

    return this.mcpIntegrationDtoMapper.toDtoArray(integrations);
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

    const command = new UpdateMcpIntegrationCommand(
      id,
      dto.name,
      dto.credentials,
      dto.authHeaderName,
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
}
