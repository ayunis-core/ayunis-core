import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { WorkspaceMembersRepository } from 'src/domain/workspaces/application/ports/workspace-members-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceInvitationNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { DeclineWorkspaceInvitationCommand } from './decline-workspace-invitation.command';

@Injectable()
export class DeclineWorkspaceInvitationUseCase {
  constructor(
    @InjectPinoLogger(DeclineWorkspaceInvitationUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: WorkspaceMembersRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: DeclineWorkspaceInvitationCommand): Promise<void> {
    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');
    if (!userId || !orgId) throw new UnauthorizedAccessError();
    this.logger.info(
      { workspaceId: command.workspaceId },
      'Declining workspace invitation',
    );
    const declined = await this.repository.declineInvitation(
      command.workspaceId,
      userId,
      orgId,
    );
    if (!declined) {
      throw new WorkspaceInvitationNotFoundError(command.workspaceId);
    }
  }
}
