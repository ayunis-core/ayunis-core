import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
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
import { ToggleWorkspacePinnedUseCase } from 'src/domain/workspaces/application/use-cases/toggle-workspace-pinned/toggle-workspace-pinned.use-case';
import { ToggleWorkspacePinnedCommand } from 'src/domain/workspaces/application/use-cases/toggle-workspace-pinned/toggle-workspace-pinned.command';
import { ReorderWorkspacesUseCase } from 'src/domain/workspaces/application/use-cases/reorder-workspaces/reorder-workspaces.use-case';
import { ReorderWorkspacesCommand } from 'src/domain/workspaces/application/use-cases/reorder-workspaces/reorder-workspaces.command';
import { CreateWorkspaceDto } from './dtos/create-workspace.dto';
import { UpdateWorkspaceDto } from './dtos/update-workspace.dto';
import { ReorderWorkspacesDto } from './dtos/reorder-workspaces.dto';
import { WorkspaceResponseDto } from './dtos/workspace-response.dto';
import { WorkspaceDtoMapper } from './mappers/workspace-dto.mapper';

@ApiTags('workspaces')
@Controller('workspaces')
@RequireFeature(FeatureFlag.Workspaces)
export class WorkspacesController {
  private readonly logger = new Logger(WorkspacesController.name);

  constructor(
    private readonly createWorkspaceUseCase: CreateWorkspaceUseCase,
    private readonly findAllWorkspacesUseCase: FindAllWorkspacesUseCase,
    private readonly findWorkspaceUseCase: FindWorkspaceUseCase,
    private readonly updateWorkspaceUseCase: UpdateWorkspaceUseCase,
    private readonly deleteWorkspaceUseCase: DeleteWorkspaceUseCase,
    private readonly toggleWorkspacePinnedUseCase: ToggleWorkspacePinnedUseCase,
    private readonly reorderWorkspacesUseCase: ReorderWorkspacesUseCase,
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
    this.logger.log('create');
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
  @ApiResponse({
    status: 200,
    description: 'The workspaces in their manual order',
    type: [WorkspaceResponseDto],
  })
  async findAll(): Promise<WorkspaceResponseDto[]> {
    this.logger.log('findAll');
    const workspaces = await this.findAllWorkspacesUseCase.execute();
    return workspaces.map((workspace) =>
      this.workspaceDtoMapper.toDto(workspace),
    );
  }

  // Declared before `PATCH :id` so `reorder` is not swallowed by the id route.
  @Patch('reorder')
  @ApiOperation({ summary: 'Set the manual order of the workspaces' })
  @ApiResponse({
    status: 200,
    description: 'The workspaces in their new order',
    type: [WorkspaceResponseDto],
  })
  async reorder(
    @Body() dto: ReorderWorkspacesDto,
  ): Promise<WorkspaceResponseDto[]> {
    this.logger.log('reorder');
    const workspaces = await this.reorderWorkspacesUseCase.execute(
      new ReorderWorkspacesCommand({
        workspaceIds: dto.workspaceIds as UUID[],
      }),
    );
    return workspaces.map((workspace) =>
      this.workspaceDtoMapper.toDto(workspace),
    );
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
    this.logger.log('findOne', { id });
    const workspace = await this.findWorkspaceUseCase.execute(
      new FindWorkspaceQuery({ workspaceId: id }),
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
    this.logger.log('update', { id });
    const workspace = await this.updateWorkspaceUseCase.execute(
      new UpdateWorkspaceCommand({
        workspaceId: id,
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        color: dto.color,
      }),
    );
    return this.workspaceDtoMapper.toDto(workspace);
  }

  @Patch(':id/toggle-pinned')
  @ApiOperation({ summary: 'Pin or unpin a workspace in the sidebar' })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the workspace',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'The workspace with its new pin state',
    type: WorkspaceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async togglePinned(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<WorkspaceResponseDto> {
    this.logger.log('togglePinned', { id });
    const workspace = await this.toggleWorkspacePinnedUseCase.execute(
      new ToggleWorkspacePinnedCommand({ workspaceId: id }),
    );
    return this.workspaceDtoMapper.toDto(workspace);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    // True one stack-branch up, where the threads FK cascade lands; kept
    // stable here so the generated OpenAPI client does not churn mid-stack.
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
    this.logger.log('remove', { id });
    await this.deleteWorkspaceUseCase.execute(
      new DeleteWorkspaceCommand({ workspaceId: id }),
    );
  }
}
