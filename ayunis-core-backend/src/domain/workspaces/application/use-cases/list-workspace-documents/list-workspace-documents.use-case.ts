import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { ListSourcesByWorkspaceQuery } from 'src/domain/sources/application/use-cases/list-sources-by-workspace/list-sources-by-workspace.query';
import { ListSourcesByWorkspaceUseCase } from 'src/domain/sources/application/use-cases/list-sources-by-workspace/list-sources-by-workspace.use-case';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { ListWorkspaceDocumentsQuery } from './list-workspace-documents.query';

@Injectable()
export class ListWorkspaceDocumentsUseCase {
  constructor(
    @InjectPinoLogger(ListWorkspaceDocumentsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly listSourcesByWorkspaceUseCase: ListSourcesByWorkspaceUseCase,
    private readonly accessService: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: ListWorkspaceDocumentsQuery,
  ): Promise<Paginated<Source>> {
    this.logger.info(
      { workspaceId: query.workspaceId },
      'listWorkspaceDocuments',
    );
    await this.accessService.requireAccessLevel(
      query.workspaceId,
      WorkspaceAccessLevel.USE,
    );
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
