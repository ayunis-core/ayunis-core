import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { ListSourcesByWorkspaceUseCase } from 'src/domain/sources/application/use-cases/list-sources-by-workspace/list-sources-by-workspace.use-case';
import { ListSourcesByWorkspaceQuery } from 'src/domain/sources/application/use-cases/list-sources-by-workspace/list-sources-by-workspace.query';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { ListWorkspaceDocumentsQuery } from './list-workspace-documents.query';

@Injectable()
export class ListWorkspaceDocumentsUseCase {
  private readonly logger = new Logger(ListWorkspaceDocumentsUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly listSourcesByWorkspaceUseCase: ListSourcesByWorkspaceUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: ListWorkspaceDocumentsQuery,
  ): Promise<Paginated<Source>> {
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();

    this.logger.log(
      { workspaceId: query.workspaceId },
      'listWorkspaceDocuments',
    );
    const workspace = await this.workspacesRepository.findById(
      userId,
      query.workspaceId,
    );
    if (!workspace) throw new WorkspaceNotFoundError(query.workspaceId);

    return this.listSourcesByWorkspaceUseCase.execute(
      new ListSourcesByWorkspaceQuery({
        workspaceId: query.workspaceId,
        search: query.search,
        limit: query.limit,
        offset: query.offset,
      }),
    );
  }
}
