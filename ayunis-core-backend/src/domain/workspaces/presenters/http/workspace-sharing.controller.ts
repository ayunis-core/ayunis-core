import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { RequirePermission } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { GetWorkspaceAccessQuery } from 'src/domain/workspaces/application/use-cases/get-workspace-access/get-workspace-access.query';
import { GetWorkspaceAccessUseCase } from 'src/domain/workspaces/application/use-cases/get-workspace-access/get-workspace-access.use-case';
import { GetWorkspaceSharingQuery } from 'src/domain/workspaces/application/use-cases/get-workspace-sharing/get-workspace-sharing.query';
import { GetWorkspaceSharingUseCase } from 'src/domain/workspaces/application/use-cases/get-workspace-sharing/get-workspace-sharing.use-case';
import { UpdateWorkspaceVisibilityCommand } from 'src/domain/workspaces/application/use-cases/update-workspace-visibility/update-workspace-visibility.command';
import { UpdateWorkspaceVisibilityUseCase } from 'src/domain/workspaces/application/use-cases/update-workspace-visibility/update-workspace-visibility.use-case';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { UpdateWorkspaceVisibilityDto } from './dtos/update-workspace-visibility.dto';
import { WorkspaceAccessResponseDto } from './dtos/workspace-access-response.dto';
import { WorkspaceSharingResponseDto } from './dtos/workspace-sharing-response.dto';
import { WorkspaceSharingDtoMapper } from './mappers/workspace-sharing-dto.mapper';

@ApiTags('workspace-sharing')
@Controller('workspaces/:workspaceId')
@RequireFeature(FeatureFlag.Workspaces)
export class WorkspaceSharingController {
  constructor(
    private readonly getWorkspaceAccessUseCase: GetWorkspaceAccessUseCase,
    private readonly getWorkspaceSharingUseCase: GetWorkspaceSharingUseCase,
    private readonly updateWorkspaceVisibilityUseCase: UpdateWorkspaceVisibilityUseCase,
    private readonly mapper: WorkspaceSharingDtoMapper,
  ) {}

  @Get('access')
  @ApiOperation({ summary: 'Get the current user workspace access' })
  @ApiResponse({ status: 200, type: WorkspaceAccessResponseDto })
  async getAccess(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
  ): Promise<WorkspaceAccessResponseDto> {
    const access = await this.getWorkspaceAccessUseCase.execute(
      new GetWorkspaceAccessQuery(workspaceId, WorkspaceAccessLevel.USE),
    );
    return {
      accessLevel: access.accessLevel,
      isOwner: access.sources.some(({ type }) => type === 'owner'),
    };
  }

  @Get('sharing')
  @RequirePermission(Permission.ASSIGN_USERS_TO_TEAMS)
  @ApiOperation({ summary: 'Get workspace sharing settings' })
  @ApiResponse({ status: 200, type: WorkspaceSharingResponseDto })
  async getSharing(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
  ): Promise<WorkspaceSharingResponseDto> {
    const view = await this.getWorkspaceSharingUseCase.execute(
      new GetWorkspaceSharingQuery(workspaceId),
    );
    return this.mapper.toSharingDto(view);
  }

  @Patch('sharing/visibility')
  @RequirePermission(Permission.ASSIGN_USERS_TO_TEAMS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update workspace visibility' })
  @ApiResponse({ status: 204 })
  async updateVisibility(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
    @Body() dto: UpdateWorkspaceVisibilityDto,
  ): Promise<void> {
    await this.updateWorkspaceVisibilityUseCase.execute(
      new UpdateWorkspaceVisibilityCommand(workspaceId, dto.visibility),
    );
  }
}
