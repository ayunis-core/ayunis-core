import { Injectable, Logger } from '@nestjs/common';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { FindThreadQuery } from './find-thread.query';
import {
  ThreadNotFoundError,
  UnexpecteThreadError,
} from 'src/domain/threads/application/threads.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { CountMessagesTokensUseCase } from 'src/domain/messages/application/use-cases/count-messages-tokens/count-messages-tokens.use-case';
import { CountMessagesTokensCommand } from 'src/domain/messages/application/use-cases/count-messages-tokens/count-messages-tokens.command';
import { getLongChatWarningThresholdTokens } from 'src/common/token-counter/application/context-budget.constants';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { getRequiredUserContext } from 'src/common/context/required-context';

export interface FindThreadResult {
  thread: Thread;
  isLongChat: boolean;
}

@Injectable()
export class FindThreadUseCase {
  private readonly logger = new Logger(FindThreadUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
    private readonly countMessagesTokensUseCase: CountMessagesTokensUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(query: FindThreadQuery): Promise<FindThreadResult> {
    this.logger.log({ threadId: query.id }, 'findOne');
    const { userId } = getRequiredUserContext(this.contextService);
    const thread = await this.threadsRepository.findOne(query.id, userId);
    if (!thread) {
      throw new ThreadNotFoundError(query.id, userId);
    }

    const tokenCount = this.countMessagesTokensUseCase.execute(
      new CountMessagesTokensCommand(thread.messages),
    );
    const warningThreshold = getLongChatWarningThresholdTokens(
      thread.model?.model.contextWindowSize,
    );
    const isLongChat = tokenCount > warningThreshold;

    return { thread, isLongChat };
  }
}
