import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspaceSharingContextService } from 'src/domain/workspaces/application/services/workspace-sharing-context.service';
import { requireEndableTeamGrant } from 'src/domain/workspaces/application/services/workspace-sharing.guards';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { EndWorkspaceTeamSharingCommand } from './end-workspace-team-sharing.command';

@Injectable()
export class EndWorkspaceTeamSharingUseCase {
  private readonly logger = new Logger(EndWorkspaceTeamSharingUseCase.name);

  constructor(private readonly sharing: WorkspaceSharingContextService) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  @Transactional()
  async execute(
    command: EndWorkspaceTeamSharingCommand,
  ): Promise<{ unlinkedCount: number }> {
    this.logger.log(command, 'Ending workspace team sharing');
    const context = await this.sharing.loadForChange(command.workspaceId);
    requireEndableTeamGrant(context, command.teamId);
    context.sharing.endTeamGrant(command.teamId);
    return this.sharing.save(context);
  }
}
