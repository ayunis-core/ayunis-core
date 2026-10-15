import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';

@Injectable()
export class FindAccessibleWorkspaceIdsUseCase {
  private readonly logger = new Logger(FindAccessibleWorkspaceIdsUseCase.name);

  constructor(
    private readonly repository: WorkspacesRepository,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(): Promise<UUID[]> {
    this.logger.debug('Finding accessible workspace ids');
    return this.repository.findAccessibleIds(
      getRequiredUserContext(this.context),
    );
  }
}
