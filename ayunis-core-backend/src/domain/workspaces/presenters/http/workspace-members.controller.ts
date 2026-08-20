import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { RequirePermission } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { InviteWorkspaceMemberCommand } from 'src/domain/workspaces/application/use-cases/invite-workspace-member/invite-workspace-member.command';
import { InviteWorkspaceMemberUseCase } from 'src/domain/workspaces/application/use-cases/invite-workspace-member/invite-workspace-member.use-case';
import { RemoveWorkspaceMemberCommand } from 'src/domain/workspaces/application/use-cases/remove-workspace-member/remove-workspace-member.command';
import { RemoveWorkspaceMemberUseCase } from 'src/domain/workspaces/application/use-cases/remove-workspace-member/remove-workspace-member.use-case';
import { UpdateWorkspaceMemberAccessLevelCommand } from 'src/domain/workspaces/application/use-cases/update-workspace-member-access-level/update-workspace-member-access-level.command';
import { UpdateWorkspaceMemberAccessLevelUseCase } from 'src/domain/workspaces/application/use-cases/update-workspace-member-access-level/update-workspace-member-access-level.use-case';
import { InviteWorkspaceMemberDto } from './dtos/invite-workspace-member.dto';
import { WorkspaceAccessLevelDto } from './dtos/workspace-access-level.dto';

@ApiTags('workspace-sharing')
@Controller('workspaces/:workspaceId/members')
@RequireFeature(FeatureFlag.Workspaces)
@RequirePermission(Permission.ASSIGN_USERS_TO_TEAMS)
export class WorkspaceMembersController {
  constructor(
    private readonly inviteWorkspaceMemberUseCase: InviteWorkspaceMemberUseCase,
    private readonly updateWorkspaceMemberAccessLevelUseCase: UpdateWorkspaceMemberAccessLevelUseCase,
    private readonly removeWorkspaceMemberUseCase: RemoveWorkspaceMemberUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Invite a workspace member' })
  @ApiResponse({ status: 204 })
  async invite(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
    @Body() dto: InviteWorkspaceMemberDto,
  ): Promise<void> {
    await this.inviteWorkspaceMemberUseCase.execute(
      new InviteWorkspaceMemberCommand(
        workspaceId,
        dto.userId as UUID,
        dto.accessLevel,
      ),
    );
  }

  @Patch(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update a workspace member access level' })
  @ApiResponse({ status: 204 })
  async updateAccessLevel(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
    @Param('userId', ParseUUIDPipe) userId: UUID,
    @Body() dto: WorkspaceAccessLevelDto,
  ): Promise<void> {
    await this.updateWorkspaceMemberAccessLevelUseCase.execute(
      new UpdateWorkspaceMemberAccessLevelCommand(
        workspaceId,
        userId,
        dto.accessLevel,
      ),
    );
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a workspace member or invitation' })
  @ApiResponse({ status: 204 })
  async remove(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
    @Param('userId', ParseUUIDPipe) userId: UUID,
  ): Promise<void> {
    await this.removeWorkspaceMemberUseCase.execute(
      new RemoveWorkspaceMemberCommand(workspaceId, userId),
    );
  }
}
