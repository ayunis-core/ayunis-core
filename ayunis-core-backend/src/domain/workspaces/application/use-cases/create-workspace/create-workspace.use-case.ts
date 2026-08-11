import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { CreateWorkspaceCommand } from './create-workspace.command';

@Injectable()
export class CreateWorkspaceUseCase {
  private readonly logger = new Logger(CreateWorkspaceUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: CreateWorkspaceCommand): Promise<Workspace> {
    this.logger.log('Creating workspace');

    const { userId, orgId } = this.resolveOwner();
    const existing = await this.workspacesRepository.findAllByUserId(userId);

    const workspace = new Workspace({
      userId,
      orgId,
      name: command.name,
      description: command.description,
      icon: command.icon,
      color: command.color,
      // A freshly created workspace goes straight into the sidebar; users
      // unpin it there rather than having to opt in after creating it.
      isPinned: true,
      sortOrder: nextSortOrder(existing),
    });

    return await this.workspacesRepository.save(workspace);
  }

  private resolveOwner(): { userId: UUID; orgId: UUID } {
    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');
    if (!userId || !orgId) {
      throw new UnauthorizedAccessError();
    }
    return { userId, orgId };
  }
}

function nextSortOrder(existing: Workspace[]): number {
  return existing.reduce((max, w) => Math.max(max, w.sortOrder), -1) + 1;
}
