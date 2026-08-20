import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  WorkspaceMembersRepository,
  type WorkspaceMember,
} from 'src/domain/workspaces/application/ports/workspace-members-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceInvitationNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { AcceptWorkspaceInvitationCommand } from './accept-workspace-invitation.command';

@Injectable()
export class AcceptWorkspaceInvitationUseCase {
  constructor(
    @InjectPinoLogger(AcceptWorkspaceInvitationUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: WorkspaceMembersRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    command: AcceptWorkspaceInvitationCommand,
  ): Promise<WorkspaceMember> {
    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');
    if (!userId || !orgId) throw new UnauthorizedAccessError();
    this.logger.info(
      { workspaceId: command.workspaceId },
      'Accepting workspace invitation',
    );
    const member = await this.repository.activateInvitation(
      command.workspaceId,
      userId,
      orgId,
    );
    if (!member) {
      throw new WorkspaceInvitationNotFoundError(command.workspaceId);
    }
    return member;
  }
}
