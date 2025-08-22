import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Thread } from '../../../domain/thread.entity';
import { ThreadsRepository } from '../../ports/threads.repository';
import { FindThreadQuery } from './find-thread.query';
import { ThreadNotFoundError } from '../../threads.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class FindThreadUseCase {
  private readonly logger = new Logger(FindThreadUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: FindThreadQuery): Promise<Thread> {
    this.logger.log('findOne', { threadId: query.id });
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }
      const thread = await this.threadsRepository.findOne(query.id, userId);
      if (!thread) {
        throw new ThreadNotFoundError(query.id, userId);
      }
      return new Thread({
        ...thread,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to find thread', {
        threadId: query.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
