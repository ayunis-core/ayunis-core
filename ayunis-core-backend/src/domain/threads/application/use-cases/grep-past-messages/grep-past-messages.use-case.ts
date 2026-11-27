import { Injectable, Logger } from '@nestjs/common';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { PastMessageMatch } from 'src/domain/threads/application/models/past-message-match';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { UnexpecteThreadError } from 'src/domain/threads/application/threads.errors';
import { GrepPastMessagesQuery } from './grep-past-messages.query';
import { getCurrentSessionClient as getCurrentThreadClient } from 'src/common/context/current-session-client';

/**
 * The current user's messages in their past chats that match a pattern.
 * Throws `InvalidPastMessagePatternError` for a pattern PostgreSQL rejects and
 * `PastMessageSearchTimeoutError` when the search hits the statement timeout.
 */
@Injectable()
export class GrepPastMessagesUseCase {
  private readonly logger = new Logger(GrepPastMessagesUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpecteThreadError)
  async execute(query: GrepPastMessagesQuery): Promise<PastMessageMatch[]> {
    this.logger.log(
      { scope: query.scope, created: query.created, limit: query.limit },
      'Grepping past messages',
    );
    const { userId } = getRequiredUserContext(this.contextService);
    return this.threadsRepository.grepPastMessages({
      userId,
      client: getCurrentThreadClient(this.contextService),
      scope: query.scope,
      pattern: query.pattern,
      created: query.created,
      limit: query.limit,
    });
  }
}
