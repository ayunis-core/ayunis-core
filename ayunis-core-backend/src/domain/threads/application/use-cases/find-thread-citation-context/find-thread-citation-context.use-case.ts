import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { ThreadCitationContext } from 'src/domain/threads/application/models/thread-citation-context';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import {
  ThreadNotFoundError,
  UnexpecteThreadError,
} from 'src/domain/threads/application/threads.errors';
import { FindThreadCitationContextQuery } from './find-thread-citation-context.query';

@Injectable()
export class FindThreadCitationContextUseCase {
  private readonly logger = new Logger(FindThreadCitationContextUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(
    query: FindThreadCitationContextQuery,
  ): Promise<ThreadCitationContext> {
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();

    this.logger.log(
      { threadId: query.threadId, userId },
      'Finding thread citation context',
    );
    const context = await this.threadsRepository.findCitationContext(
      query.threadId,
      userId,
    );
    if (!context) throw new ThreadNotFoundError(query.threadId, userId);
    return context;
  }
}
