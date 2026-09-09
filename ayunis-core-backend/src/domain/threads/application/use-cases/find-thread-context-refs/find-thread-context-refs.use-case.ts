import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  ThreadsRepository,
  type ThreadContextRefs,
} from 'src/domain/threads/application/ports/threads.repository';
import {
  ThreadNotFoundError,
  UnexpecteThreadError,
} from 'src/domain/threads/application/threads.errors';
import { FindThreadContextRefsQuery } from './find-thread-context-refs.query';

@Injectable()
export class FindThreadContextRefsUseCase {
  private readonly logger = new Logger(FindThreadContextRefsUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(query: FindThreadContextRefsQuery): Promise<ThreadContextRefs> {
    this.logger.log(
      { threadId: query.threadId },
      'Finding thread context refs',
    );
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();

    const refs = await this.threadsRepository.findContextRefs(
      query.threadId,
      userId,
    );
    if (!refs) throw new ThreadNotFoundError(query.threadId, userId);
    return refs;
  }
}
