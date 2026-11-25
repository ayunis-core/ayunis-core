import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { OparlListResult } from 'src/domain/oparl/application/models/oparl-read';
import { UnexpectedOparlError } from 'src/domain/oparl/application/oparl.errors';
import { OparlReadRepository } from 'src/domain/oparl/application/ports/oparl-read.repository';
import { OparlReadScopeService } from 'src/domain/oparl/application/services/oparl-read-scope.service';
import { ListOparlObjectsQuery } from './list-oparl-objects.query';

export const OPARL_LIST_PAGE_SIZE = 20;

/** Meetings (latest first), organizations or persons of the org's linked bodies, a page at a time. */
@Injectable()
export class ListOparlObjectsUseCase {
  private readonly logger = new Logger(ListOparlObjectsUseCase.name);

  constructor(
    private readonly scopes: OparlReadScopeService,
    private readonly reads: OparlReadRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOparlError)
  async execute(query: ListOparlObjectsQuery): Promise<OparlListResult> {
    this.logger.log(
      { type: query.type, bodyIds: query.bodyIds, page: query.page },
      'Listing OParl objects',
    );
    const offset = (query.page - 1) * OPARL_LIST_PAGE_SIZE;
    const { items, total } = await this.reads.list(
      await this.scopes.resolve(query.bodyIds),
      query.type,
      query.filters,
      { offset, limit: OPARL_LIST_PAGE_SIZE },
    );
    return {
      items,
      total,
      page: query.page,
      pageSize: OPARL_LIST_PAGE_SIZE,
      hasMore: offset + items.length < total,
    };
  }
}
