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
import { InviteWorkspaceMemberCommand } from 'src/domain/workspaces/application/use-cases/invite-workspace-member/invite-workspace-member.command';
import { InviteWorkspaceMemberUseCase } from 'src/domain/workspaces/application/use-cases/invite-workspace-member/invite-workspace-member.use-case';
import { RemoveWorkspaceMemberCommand } from 'src/domain/workspaces/application/use-cases/remove-workspace-member/remove-workspace-member.command';
import { RemoveWorkspaceMemberUseCase } from 'src/domain/workspaces/application/use-cases/remove-workspace-member/remove-workspace-member.use-case';
import { UpdateWorkspaceMemberRoleCommand } from 'src/domain/workspaces/application/use-cases/update-workspace-member-role/update-workspace-member-role.command';
import { UpdateWorkspaceMemberRoleUseCase } from 'src/domain/workspaces/application/use-cases/update-workspace-member-role/update-workspace-member-role.use-case';
import { InviteWorkspaceMemberDto } from './dtos/invite-workspace-member.dto';
import { WorkspaceRoleDto } from './dtos/workspace-role.dto';

@ApiTags('workspace-sharing')
@Controller('workspaces/:workspaceId/members')
@RequireFeature(FeatureFlag.Workspaces)
export class WorkspaceMembersController {
  constructor(
    private readonly inviteWorkspaceMemberUseCase: InviteWorkspaceMemberUseCase,
    private readonly updateWorkspaceMemberRoleUseCase: UpdateWorkspaceMemberRoleUseCase,
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
        dto.role,
      ),
    );
  }

  @Patch(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update a workspace member role' })
  @ApiResponse({ status: 204 })
  async updateRole(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
    @Param('userId', ParseUUIDPipe) userId: UUID,
    @Body() dto: WorkspaceRoleDto,
  ): Promise<void> {
    await this.updateWorkspaceMemberRoleUseCase.execute(
      new UpdateWorkspaceMemberRoleCommand(workspaceId, userId, dto.role),
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
