import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { RequirePermission } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { ListWorkspaceTeamMembersQuery } from 'src/domain/workspaces/application/use-cases/list-workspace-team-members/list-workspace-team-members.query';
import { ListWorkspaceTeamMembersUseCase } from 'src/domain/workspaces/application/use-cases/list-workspace-team-members/list-workspace-team-members.use-case';
import { WorkspaceSharingUserDto } from './dtos/workspace-sharing-response.dto';
import { WorkspaceSharingDtoMapper } from './mappers/workspace-sharing-dto.mapper';

@ApiTags('workspace-sharing')
@Controller('workspaces/:workspaceId/team-grants/:teamId/members')
@RequireFeature(FeatureFlag.Workspaces)
@RequirePermission(Permission.ASSIGN_USERS_TO_TEAMS)
export class WorkspaceTeamGrantMembersController {
  constructor(
    private readonly listWorkspaceTeamMembersUseCase: ListWorkspaceTeamMembersUseCase,
    private readonly mapper: WorkspaceSharingDtoMapper,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List members of a granted workspace team' })
  @ApiResponse({ status: 200, type: [WorkspaceSharingUserDto] })
  async list(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
  ): Promise<WorkspaceSharingUserDto[]> {
    const users = await this.listWorkspaceTeamMembersUseCase.execute(
      new ListWorkspaceTeamMembersQuery(workspaceId, teamId),
    );
    return this.mapper.toUserDtos(users);
  }
}
