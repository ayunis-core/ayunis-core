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
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { RequirePermission } from 'src/iam/authorization/application/decorators/permissions.decorator';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { AddWorkspaceTeamGrantCommand } from 'src/domain/workspaces/application/use-cases/add-workspace-team-grant/add-workspace-team-grant.command';
import { AddWorkspaceTeamGrantUseCase } from 'src/domain/workspaces/application/use-cases/add-workspace-team-grant/add-workspace-team-grant.use-case';
import { RemoveWorkspaceTeamGrantCommand } from 'src/domain/workspaces/application/use-cases/remove-workspace-team-grant/remove-workspace-team-grant.command';
import { RemoveWorkspaceTeamGrantUseCase } from 'src/domain/workspaces/application/use-cases/remove-workspace-team-grant/remove-workspace-team-grant.use-case';
import { ResetWorkspaceTeamMemberOverrideCommand } from 'src/domain/workspaces/application/use-cases/reset-workspace-team-member-override/reset-workspace-team-member-override.command';
import { ResetWorkspaceTeamMemberOverrideUseCase } from 'src/domain/workspaces/application/use-cases/reset-workspace-team-member-override/reset-workspace-team-member-override.use-case';
import { SetWorkspaceTeamMemberOverrideCommand } from 'src/domain/workspaces/application/use-cases/set-workspace-team-member-override/set-workspace-team-member-override.command';
import { SetWorkspaceTeamMemberOverrideUseCase } from 'src/domain/workspaces/application/use-cases/set-workspace-team-member-override/set-workspace-team-member-override.use-case';
import { UpdateWorkspaceTeamGrantAccessLevelCommand } from 'src/domain/workspaces/application/use-cases/update-workspace-team-grant-access-level/update-workspace-team-grant-access-level.command';
import { UpdateWorkspaceTeamGrantAccessLevelUseCase } from 'src/domain/workspaces/application/use-cases/update-workspace-team-grant-access-level/update-workspace-team-grant-access-level.use-case';
import { AddWorkspaceTeamGrantDto } from './dtos/add-workspace-team-grant.dto';
import { SetWorkspaceTeamMemberOverrideDto } from './dtos/set-workspace-team-member-override.dto';
import { WorkspaceAccessLevelDto } from './dtos/workspace-access-level.dto';

@ApiTags('workspace-sharing')
@Controller('workspaces/:workspaceId/team-grants')
@RequireFeature(FeatureFlag.Workspaces)
@RequirePermission(Permission.ASSIGN_USERS_TO_TEAMS)
export class WorkspaceTeamGrantsController {
  constructor(
    private readonly addWorkspaceTeamGrantUseCase: AddWorkspaceTeamGrantUseCase,
    private readonly updateWorkspaceTeamGrantAccessLevelUseCase: UpdateWorkspaceTeamGrantAccessLevelUseCase,
    private readonly removeWorkspaceTeamGrantUseCase: RemoveWorkspaceTeamGrantUseCase,
    private readonly setWorkspaceTeamMemberOverrideUseCase: SetWorkspaceTeamMemberOverrideUseCase,
    private readonly resetWorkspaceTeamMemberOverrideUseCase: ResetWorkspaceTeamMemberOverrideUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Grant a team workspace access' })
  @ApiResponse({ status: 204 })
  async add(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
    @Body() dto: AddWorkspaceTeamGrantDto,
  ): Promise<void> {
    await this.addWorkspaceTeamGrantUseCase.execute(
      new AddWorkspaceTeamGrantCommand(
        workspaceId,
        dto.teamId as UUID,
        dto.accessLevel,
      ),
    );
  }

  @Patch(':teamId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update a workspace team access level' })
  @ApiResponse({ status: 204 })
  async updateAccessLevel(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
    @Body() dto: WorkspaceAccessLevelDto,
  ): Promise<void> {
    await this.updateWorkspaceTeamGrantAccessLevelUseCase.execute(
      new UpdateWorkspaceTeamGrantAccessLevelCommand(
        workspaceId,
        teamId,
        dto.accessLevel,
      ),
    );
  }

  @Delete(':teamId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a workspace team grant' })
  @ApiResponse({ status: 204 })
  async remove(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
  ): Promise<void> {
    await this.removeWorkspaceTeamGrantUseCase.execute(
      new RemoveWorkspaceTeamGrantCommand(workspaceId, teamId),
    );
  }

  @Put(':teamId/overrides/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set a team member workspace override' })
  @ApiResponse({ status: 204 })
  async setOverride(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
    @Param('userId', ParseUUIDPipe) userId: UUID,
    @Body() dto: SetWorkspaceTeamMemberOverrideDto,
  ): Promise<void> {
    await this.setWorkspaceTeamMemberOverrideUseCase.execute(
      new SetWorkspaceTeamMemberOverrideCommand(
        workspaceId,
        teamId,
        userId,
        dto.accessLevel === null
          ? { accessLevel: null, excluded: true }
          : { accessLevel: dto.accessLevel, excluded: false },
      ),
    );
  }

  @Delete(':teamId/overrides/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset a team member workspace override' })
  @ApiResponse({ status: 204 })
  async resetOverride(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
    @Param('userId', ParseUUIDPipe) userId: UUID,
  ): Promise<void> {
    await this.resetWorkspaceTeamMemberOverrideUseCase.execute(
      new ResetWorkspaceTeamMemberOverrideCommand(workspaceId, teamId, userId),
    );
  }
}
