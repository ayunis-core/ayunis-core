import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { ListSourcesByWorkspaceQuery } from './list-sources-by-workspace.query';

@Injectable()
export class ListSourcesByWorkspaceUseCase {
  constructor(
    @InjectPinoLogger(ListSourcesByWorkspaceUseCase.name)
    private readonly logger: PinoLogger,
    private readonly sourceRepository: SourceRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(
    query: ListSourcesByWorkspaceQuery,
  ): Promise<Paginated<Source>> {
    this.logger.info(
      {
        workspaceId: query.workspaceId,
        search: query.search,
        limit: query.limit,
        offset: query.offset,
      },
      'listSourcesByWorkspace',
    );
    return this.sourceRepository.findPaginatedByWorkspaceId({
      workspaceId: query.workspaceId,
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    });
  }
}
