import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { EndWorkspaceTeamSharingCommand } from 'src/domain/workspaces/application/use-cases/end-workspace-team-sharing/end-workspace-team-sharing.command';
import { EndWorkspaceTeamSharingUseCase } from 'src/domain/workspaces/application/use-cases/end-workspace-team-sharing/end-workspace-team-sharing.use-case';
import { GetWorkspaceSharingUseCase } from 'src/domain/workspaces/application/use-cases/get-workspace-sharing/get-workspace-sharing.use-case';
import { ListShareCandidatesUseCase } from 'src/domain/workspaces/application/use-cases/list-share-candidates/list-share-candidates.use-case';
import { RemoveWorkspaceMemberCommand } from 'src/domain/workspaces/application/use-cases/remove-workspace-member/remove-workspace-member.command';
import { RemoveWorkspaceMemberUseCase } from 'src/domain/workspaces/application/use-cases/remove-workspace-member/remove-workspace-member.use-case';
import { SetWorkspaceMemberAccessCommand } from 'src/domain/workspaces/application/use-cases/set-workspace-member-access/set-workspace-member-access.command';
import { SetWorkspaceMemberAccessUseCase } from 'src/domain/workspaces/application/use-cases/set-workspace-member-access/set-workspace-member-access.use-case';
import { SetWorkspaceOrganizationSharingUseCase } from 'src/domain/workspaces/application/use-cases/set-workspace-organization-sharing/set-workspace-organization-sharing.use-case';
import { ShareWorkspaceCommand } from 'src/domain/workspaces/application/use-cases/share-workspace/share-workspace.command';
import { ShareWorkspaceUseCase } from 'src/domain/workspaces/application/use-cases/share-workspace/share-workspace.use-case';
import { toSharingDto } from './mappers/workspace-sharing-dto.mapper';
import {
  RemoveWorkspaceMemberQueryDto,
  SetWorkspaceMemberAccessDto,
  SetWorkspaceOrganizationSharingDto,
  ShareCandidatesResponseDto,
  ShareWorkspaceDto,
  SharingChangeResponseDto,
  WorkspaceSharingResponseDto,
} from './dtos/workspace-sharing.dto';

@ApiTags('workspace-sharing')
@Controller('workspaces/:id')
export class WorkspaceSharingController {
  constructor(
    private readonly getSharing: GetWorkspaceSharingUseCase,
    private readonly listCandidates: ListShareCandidatesUseCase,
    private readonly share: ShareWorkspaceUseCase,
    private readonly setMemberAccess: SetWorkspaceMemberAccessUseCase,
    private readonly removeMember: RemoveWorkspaceMemberUseCase,
    private readonly setOrganizationSharing: SetWorkspaceOrganizationSharingUseCase,
    private readonly endTeamSharing: EndWorkspaceTeamSharingUseCase,
  ) {}

  @Get('sharing')
  @ApiOperation({
    summary: 'Who has access to a workspace, and what the caller may change',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: WorkspaceSharingResponseDto })
  async sharing(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<WorkspaceSharingResponseDto> {
    return toSharingDto(await this.getSharing.execute({ workspaceId: id }));
  }

  @Get('share-candidates')
  @ApiOperation({
    summary: 'People, teams and the organisation the caller may invite',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: ShareCandidatesResponseDto })
  async candidates(
    @Param('id', ParseUUIDPipe) id: UUID,
  ): Promise<ShareCandidatesResponseDto> {
    return this.listCandidates.execute({ workspaceId: id });
  }

  @Post('shares')
  @ApiOperation({
    summary: 'Give people and teams access; they get it at once',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, type: SharingChangeResponseDto })
  async invite(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: ShareWorkspaceDto,
  ): Promise<SharingChangeResponseDto> {
    return this.share.execute(
      new ShareWorkspaceCommand(id, dto.userIds, dto.teamIds, dto.accessLevel),
    );
  }

  @Put('members/:userId')
  @ApiOperation({ summary: 'Change what a member may do' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: SharingChangeResponseDto })
  async setAccess(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('userId', ParseUUIDPipe) userId: UUID,
    @Body() dto: SetWorkspaceMemberAccessDto,
  ): Promise<SharingChangeResponseDto> {
    return this.setMemberAccess.execute(
      new SetWorkspaceMemberAccessCommand(
        id,
        userId,
        dto.accessLevel,
        dto.teamId,
      ),
    );
  }

  @Delete('members/:userId')
  @ApiOperation({
    summary:
      'Take a member out of where they are shown (direct grant, team or organisation)',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: SharingChangeResponseDto })
  async remove(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('userId', ParseUUIDPipe) userId: UUID,
    @Query() query: RemoveWorkspaceMemberQueryDto,
  ): Promise<SharingChangeResponseDto> {
    return this.removeMember.execute(
      new RemoveWorkspaceMemberCommand(id, userId, query.teamId),
    );
  }

  @Delete('teams/:teamId')
  @ApiOperation({
    summary:
      'End a team share: everyone who only has access through this team loses it, later team members get none',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'teamId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: SharingChangeResponseDto })
  @ApiResponse({
    status: 403,
    description:
      'No right to manage this team, or the caller would lose access',
  })
  @ApiResponse({ status: 404, description: 'The team has no access' })
  async endTeam(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Param('teamId', ParseUUIDPipe) teamId: UUID,
  ): Promise<SharingChangeResponseDto> {
    return this.endTeamSharing.execute(
      new EndWorkspaceTeamSharingCommand(id, teamId),
    );
  }

  @Put('sharing/organization')
  @ApiOperation({
    summary: 'Share the workspace with the whole organisation, or stop',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: SharingChangeResponseDto })
  async organization(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: SetWorkspaceOrganizationSharingDto,
  ): Promise<SharingChangeResponseDto> {
    return this.setOrganizationSharing.execute({
      workspaceId: id,
      shared: dto.shared,
    });
  }
}
