import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ThreadsRepository } from '../../ports/threads.repository';
import type { ExpiredThreadRef } from '../../ports/threads.repository';
import type { FindExpiredThreadRefsByOrgQuery } from './find-expired-thread-refs-by-org.query';
import { UnexpectedThreadError } from '../../threads.errors';

// Re-exported so other modules consume this type through the use-case surface
// rather than importing the threads repository port directly (forbidden by the
// no-cross-module-port-imports architecture rule).
export type { ExpiredThreadRef };

/**
 * Returns a page of expired thread references (id + owner) for an org, for
 * data-retention enforcement. Exposed as a use case so other modules consume
 * threads functionality through the application layer rather than the
 * repository port directly.
 */
@Injectable()
export class FindExpiredThreadRefsByOrgUseCase {
  private readonly logger = new Logger(FindExpiredThreadRefsByOrgUseCase.name);

  constructor(private readonly threadsRepository: ThreadsRepository) {}

  @HandleUnexpectedErrors(UnexpectedThreadError)
  async execute(
    query: FindExpiredThreadRefsByOrgQuery,
  ): Promise<ExpiredThreadRef[]> {
    this.logger.debug('findExpiredThreadRefsByOrg', {
      orgId: query.orgId,
      activeBefore: query.activeBefore,
      limit: query.limit,
      offset: query.offset,
    });
    return this.threadsRepository.findExpiredThreadRefsByOrg({
      orgId: query.orgId,
      activeBefore: query.activeBefore,
      limit: query.limit,
      offset: query.offset,
    });
  }
}
