import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { ReorderWorkspacesCommand } from './reorder-workspaces.command';

@Injectable()
export class ReorderWorkspacesUseCase {
  private readonly logger = new Logger(ReorderWorkspacesUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: ReorderWorkspacesCommand): Promise<Workspace[]> {
    this.logger.log('Reordering workspaces', {
      count: command.workspaceIds.length,
    });

    const userId = this.resolveUserId();
    // `findAllByUserId` is already ordered by sortOrder, so appending the
    // workspaces the caller left out preserves their relative order.
    const owned = await this.workspacesRepository.findAllByUserId(userId);
    const ownedIds = new Set(owned.map((workspace) => workspace.id));

    // Ids the caller does not own are dropped rather than rejected: the client
    // sends the order it currently renders, which can lag a deletion.
    const requested = command.workspaceIds.filter((id) => ownedIds.has(id));
    const placed = new Set(requested);

    // Every owned workspace is renumbered, not just the ones sent. The sidebar
    // only ever reorders the pinned subset, and renumbering that subset alone
    // would collide with the untouched workspaces' existing sortOrder values.
    const orderedIds = [
      ...placed,
      ...owned.map((workspace) => workspace.id).filter((id) => !placed.has(id)),
    ];

    await this.workspacesRepository.updateSortOrders(userId, orderedIds);
    return await this.workspacesRepository.findAllByUserId(userId);
  }

  private resolveUserId(): UUID {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }
    return userId;
  }
}
