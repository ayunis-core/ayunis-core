import { Injectable, Logger } from '@nestjs/common';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import {
  ThreadNotFoundError,
  UnexpecteThreadError,
} from 'src/domain/threads/application/threads.errors';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import { FindPastChatQuery } from './find-past-chat.query';

/**
 * One of the current user's past chats with its messages. A chat outside the
 * scope is not found, exactly like a missing one.
 */
@Injectable()
export class FindPastChatUseCase {
  private readonly logger = new Logger(FindPastChatUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(query: FindPastChatQuery): Promise<Thread> {
    this.logger.log(
      { scope: query.scope, threadId: query.threadId },
      'Finding past chat',
    );
    const { userId } = getRequiredUserContext(this.contextService);
    const thread = await this.threadsRepository.findPastChat({
      userId,
      scope: query.scope,
      threadId: query.threadId,
    });
    if (!thread) throw new ThreadNotFoundError(query.threadId, userId);
    return thread;
  }
}
