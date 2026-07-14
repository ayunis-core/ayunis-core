import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Thread } from '../../../domain/thread.entity';
import { ThreadsRepository } from '../../ports/threads.repository';
import { FindThreadQuery } from './find-thread.query';
import {
  ThreadNotFoundError,
  UnexpectedThreadError,
} from '../../threads.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { CountMessagesTokensUseCase } from 'src/domain/messages/application/use-cases/count-messages-tokens/count-messages-tokens.use-case';
import { CountMessagesTokensCommand } from 'src/domain/messages/application/use-cases/count-messages-tokens/count-messages-tokens.command';

const WARNING_THRESHOLD_TOKENS = 50000;

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

  @HandleUnexpectedErrors(UnexpectedThreadError)
  async execute(query: FindThreadQuery): Promise<FindThreadResult> {
    this.logger.log('findOne', { threadId: query.id });
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    const thread = await this.threadsRepository.findOne(query.id, userId);
    if (!thread) {
      throw new ThreadNotFoundError(query.id, userId);
    }

    const tokenCount = this.countMessagesTokensUseCase.execute(
      new CountMessagesTokensCommand(thread.messages),
    );
    const isLongChat = tokenCount > WARNING_THRESHOLD_TOKENS;

    return { thread, isLongChat };
  }
}
