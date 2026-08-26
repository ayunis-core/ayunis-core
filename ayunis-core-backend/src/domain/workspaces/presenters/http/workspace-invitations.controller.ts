import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { AcceptWorkspaceInvitationCommand } from 'src/domain/workspaces/application/use-cases/accept-workspace-invitation/accept-workspace-invitation.command';
import { AcceptWorkspaceInvitationUseCase } from 'src/domain/workspaces/application/use-cases/accept-workspace-invitation/accept-workspace-invitation.use-case';
import { DeclineWorkspaceInvitationCommand } from 'src/domain/workspaces/application/use-cases/decline-workspace-invitation/decline-workspace-invitation.command';
import { DeclineWorkspaceInvitationUseCase } from 'src/domain/workspaces/application/use-cases/decline-workspace-invitation/decline-workspace-invitation.use-case';
import { ListMyWorkspaceInvitationsUseCase } from 'src/domain/workspaces/application/use-cases/list-my-workspace-invitations/list-my-workspace-invitations.use-case';
import { WorkspaceInvitationResponseDto } from './dtos/workspace-invitation-response.dto';
import { WorkspaceSharingDtoMapper } from './mappers/workspace-sharing-dto.mapper';

@ApiTags('workspace-invitations')
@Controller('workspace-invitations')
@RequireFeature(FeatureFlag.Workspaces)
export class WorkspaceInvitationsController {
  constructor(
    private readonly listMyWorkspaceInvitationsUseCase: ListMyWorkspaceInvitationsUseCase,
    private readonly acceptWorkspaceInvitationUseCase: AcceptWorkspaceInvitationUseCase,
    private readonly declineWorkspaceInvitationUseCase: DeclineWorkspaceInvitationUseCase,
    private readonly mapper: WorkspaceSharingDtoMapper,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List my pending workspace invitations' })
  @ApiResponse({ status: 200, type: [WorkspaceInvitationResponseDto] })
  async list(): Promise<WorkspaceInvitationResponseDto[]> {
    const invitations = await this.listMyWorkspaceInvitationsUseCase.execute();
    return invitations.map((invitation) =>
      this.mapper.toInvitationDto(invitation),
    );
  }

  @Post(':workspaceId/accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Accept a workspace invitation' })
  @ApiResponse({ status: 204 })
  async accept(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
  ): Promise<void> {
    await this.acceptWorkspaceInvitationUseCase.execute(
      new AcceptWorkspaceInvitationCommand(workspaceId),
    );
  }

  @Post(':workspaceId/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Decline a workspace invitation' })
  @ApiResponse({ status: 204 })
  async decline(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: UUID,
  ): Promise<void> {
    await this.declineWorkspaceInvitationUseCase.execute(
      new DeclineWorkspaceInvitationCommand(workspaceId),
    );
  }
}
