import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { FindWorkspaceQuery } from './find-workspace.query';

@Injectable()
export class FindWorkspaceUseCase {
  constructor(
    @InjectPinoLogger(FindWorkspaceUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(query: FindWorkspaceQuery): Promise<Workspace> {
    this.logger.info({ workspaceId: query.id }, 'Finding workspace');

    const workspace = await this.workspacesRepository.findById(
      this.resolveUserId(),
      query.id,
    );
    if (!workspace) {
      throw new WorkspaceNotFoundError(query.id);
    }
    return workspace;
  }

  private resolveUserId(): UUID {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }
    return userId;
  }
}
