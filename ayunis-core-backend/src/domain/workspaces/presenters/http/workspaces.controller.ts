import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { CreateWorkspaceUseCase } from 'src/domain/workspaces/application/use-cases/create-workspace/create-workspace.use-case';
import { CreateWorkspaceCommand } from 'src/domain/workspaces/application/use-cases/create-workspace/create-workspace.command';
import { FindAllWorkspacesUseCase } from 'src/domain/workspaces/application/use-cases/find-all-workspaces/find-all-workspaces.use-case';
import { FindWorkspaceUseCase } from 'src/domain/workspaces/application/use-cases/find-workspace/find-workspace.use-case';
import { FindWorkspaceQuery } from 'src/domain/workspaces/application/use-cases/find-workspace/find-workspace.query';
import { UpdateWorkspaceUseCase } from 'src/domain/workspaces/application/use-cases/update-workspace/update-workspace.use-case';
import { UpdateWorkspaceCommand } from 'src/domain/workspaces/application/use-cases/update-workspace/update-workspace.command';
import { DeleteWorkspaceUseCase } from 'src/domain/workspaces/application/use-cases/delete-workspace/delete-workspace.use-case';
import { DeleteWorkspaceCommand } from 'src/domain/workspaces/application/use-cases/delete-workspace/delete-workspace.command';
import { CreateWorkspaceDto } from './dtos/create-workspace.dto';
import { UpdateWorkspaceDto } from './dtos/update-workspace.dto';
import { WorkspaceResponseDto } from './dtos/workspace-response.dto';
import { WorkspaceDtoMapper } from './mappers/workspace-dto.mapper';
import { FindAllWorkspacesQuery } from 'src/domain/workspaces/application/use-cases/find-all-workspaces/find-all-workspaces.query';
import { FindAllWorkspacesQueryParamsDto } from './dtos/find-all-workspaces-query-params.dto';
import { WorkspaceListResponseDto } from './dtos/workspace-list-response.dto';

@ApiTags('workspaces')
@Controller('workspaces')
@RequireFeature(FeatureFlag.Workspaces)
export class WorkspacesController {
  constructor(
    @InjectPinoLogger(WorkspacesController.name)
    private readonly logger: PinoLogger,
    private readonly createWorkspaceUseCase: CreateWorkspaceUseCase,
    private readonly findAllWorkspacesUseCase: FindAllWorkspacesUseCase,
    private readonly findWorkspaceUseCase: FindWorkspaceUseCase,
    private readonly updateWorkspaceUseCase: UpdateWorkspaceUseCase,
    private readonly deleteWorkspaceUseCase: DeleteWorkspaceUseCase,
    private readonly workspaceDtoMapper: WorkspaceDtoMapper,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a workspace' })
  @ApiResponse({
    status: 201,
    description: 'The created workspace',
    type: WorkspaceResponseDto,
  })
  async create(@Body() dto: CreateWorkspaceDto): Promise<WorkspaceResponseDto> {
    this.logger.info('create');
    const workspace = await this.createWorkspaceUseCase.execute(
      new CreateWorkspaceCommand({
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        color: dto.color,
      }),
    );
    return this.workspaceDtoMapper.toDto(workspace);
  }

  @Get()
  @ApiOperation({ summary: 'List the current user’s workspaces' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['updatedAt', 'createdAt', 'name'],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, default: 0 })
  @ApiResponse({
    status: 200,
    description: 'A page of workspaces ordered by the requested sort',
    type: WorkspaceListResponseDto,
  })
  async findAll(
    @Query() queryParams: FindAllWorkspacesQueryParamsDto,
  ): Promise<WorkspaceListResponseDto> {
    this.logger.info('findAll');
    const page = await this.findAllWorkspacesUseCase.execute(
      new FindAllWorkspacesQuery(queryParams),
    );
    return this.workspaceDtoMapper.toPaginatedDto(page);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a workspace' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the workspace',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'The workspace',
    type: WorkspaceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<WorkspaceResponseDto> {
    this.logger.info({ id }, 'findOne');
    const workspace = await this.findWorkspaceUseCase.execute(
      new FindWorkspaceQuery(id),
    );
    return this.workspaceDtoMapper.toDto(workspace);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a workspace' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the workspace',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'The updated workspace',
    type: WorkspaceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    this.logger.info({ id }, 'update');
    const workspace = await this.updateWorkspaceUseCase.execute(
      new UpdateWorkspaceCommand({
        id,
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        color: dto.color,
      }),
    );
    return this.workspaceDtoMapper.toDto(workspace);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a workspace and every chat inside it',
  })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the workspace',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({ status: 204, description: 'The workspace was deleted' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async remove(@Param('id', ParseUUIDPipe) id: UUID): Promise<void> {
    this.logger.info({ id }, 'remove');
    await this.deleteWorkspaceUseCase.execute(new DeleteWorkspaceCommand(id));
  }
}
