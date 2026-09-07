import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';

@Injectable()
export class AssertWorkspaceWriteAccessUseCase {
  private readonly logger = new Logger(AssertWorkspaceWriteAccessUseCase.name);
  constructor(private readonly access: WorkspaceAccessService) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(query: { workspaceId: UUID }): Promise<void> {
    this.logger.log(
      { workspaceId: query.workspaceId },
      'Checking workspace write access',
    );
    await this.access.requireOwned(query.workspaceId);
  }
}
