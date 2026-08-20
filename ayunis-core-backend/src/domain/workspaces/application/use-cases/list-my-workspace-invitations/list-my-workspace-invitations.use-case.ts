import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  WorkspaceInvitationsReadRepository,
  type WorkspaceInvitation,
} from 'src/domain/workspaces/application/ports/workspace-invitations-read-repository.port';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';

@Injectable()
export class ListMyWorkspaceInvitationsUseCase {
  constructor(
    @InjectPinoLogger(ListMyWorkspaceInvitationsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly repository: WorkspaceInvitationsReadRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(): Promise<WorkspaceInvitation[]> {
    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');
    if (!userId || !orgId) throw new UnauthorizedAccessError();
    this.logger.info({ userId, orgId }, 'Listing workspace invitations');
    return this.repository.findPendingByUser(userId, orgId);
  }
}
