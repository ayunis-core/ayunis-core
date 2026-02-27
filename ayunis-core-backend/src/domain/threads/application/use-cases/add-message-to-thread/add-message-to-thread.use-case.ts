import { Injectable, Logger } from '@nestjs/common';
import { Histogram } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Thread } from '../../../domain/thread.entity';
import { AddMessageCommand } from './add-message.command';
import { MessageAdditionError } from '../../threads.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { AYUNIS_THREAD_MESSAGE_COUNT } from 'src/metrics/metrics.constants';
import { getUserContextLabels, safeMetric } from 'src/metrics/metrics.utils';

@Injectable()
export class AddMessageToThreadUseCase {
  private readonly logger = new Logger(AddMessageToThreadUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    @InjectMetric(AYUNIS_THREAD_MESSAGE_COUNT)
    private readonly threadMessageHistogram: Histogram<string>,
  ) {}

  execute(command: AddMessageCommand): Thread {
    this.logger.log('addMessage', {
      threadId: command.thread.id,
      messageRole: command.message.role,
    });
    try {
      command.thread.messages.push(command.message);

      // Observing on every message addition is intentional: it gives the
      // distribution of thread sizes at write time. The _sum/_count ratio
      // yields average thread length across all writes.
      safeMetric(this.logger, () => {
        const labels = getUserContextLabels(this.contextService);
        this.threadMessageHistogram.observe(
          labels,
          command.thread.messages.length,
        );
      });

      return command.thread;
    } catch (error) {
      this.logger.error('Failed to add message to thread', {
        threadId: command.thread.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error instanceof Error
        ? new MessageAdditionError(command.thread.id, error)
        : new MessageAdditionError(
            command.thread.id,
            new Error('Unknown error'),
          );
    }
  }
}
