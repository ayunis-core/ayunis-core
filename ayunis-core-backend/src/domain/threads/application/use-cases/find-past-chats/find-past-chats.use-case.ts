import { Injectable, Logger } from '@nestjs/common';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { Paginated } from 'src/common/pagination/paginated.entity';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { UnexpecteThreadError } from 'src/domain/threads/application/threads.errors';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import { FindPastChatsQuery } from './find-past-chats.query';
import { getCurrentSessionClient as getCurrentThreadClient } from 'src/common/context/current-session-client';

/** The current user's chats a run may look back on, without their messages. */
@Injectable()
export class FindPastChatsUseCase {
  private readonly logger = new Logger(FindPastChatsUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(query: FindPastChatsQuery): Promise<Paginated<Thread>> {
    this.logger.log(
      { scope: query.scope, activity: query.activity, offset: query.offset },
      'Finding past chats',
    );
    const { userId } = getRequiredUserContext(this.contextService);
    return this.threadsRepository.findPastChats({
      userId,
      client: getCurrentThreadClient(this.contextService),
      scope: query.scope,
      activity: query.activity,
      pagination: { limit: query.limit, offset: query.offset },
    });
  }
}
