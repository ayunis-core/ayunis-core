import { Injectable, Logger, Inject } from '@nestjs/common';
import { Counter } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { CreateAssistantMessageCommand } from './create-assistant-message.command';
import { AssistantMessage } from '../../../domain/messages/assistant-message.entity';
import {
  MESSAGES_REPOSITORY,
  MessagesRepository,
} from '../../ports/messages.repository';
import { MessageRole } from '../../../domain/value-objects/message-role.object';
import { MessageCreationError } from '../../messages.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { AYUNIS_MESSAGES_TOTAL } from 'src/metrics/metrics.constants';
import { getUserContextLabels, safeMetric } from 'src/metrics/metrics.utils';

@Injectable()
export class CreateAssistantMessageUseCase {
  private readonly logger = new Logger(CreateAssistantMessageUseCase.name);

  constructor(
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepository: MessagesRepository,
    private readonly contextService: ContextService,
    @InjectMetric(AYUNIS_MESSAGES_TOTAL)
    private readonly messagesCounter: Counter<string>,
  ) {}

  async execute(
    command: CreateAssistantMessageCommand,
  ): Promise<AssistantMessage> {
    this.logger.log('Creating assistant message', {
      threadId: command.threadId,
    });

    const assistantMessage = new AssistantMessage({
      threadId: command.threadId,
      content: command.content,
    });

    try {
      const saved = (await this.messagesRepository.create(
        assistantMessage,
      )) as AssistantMessage;

      safeMetric(this.logger, () => {
        const labels = getUserContextLabels(this.contextService);
        this.messagesCounter.inc({ ...labels, role: 'assistant' });
      });

      return saved;
    } catch (error) {
      this.logger.error('Failed to create assistant message', {
        threadId: command.threadId,
        error: error as Error,
      });
      throw error instanceof Error
        ? new MessageCreationError(MessageRole.ASSISTANT.toLowerCase(), error)
        : new MessageCreationError(
            MessageRole.ASSISTANT.toLowerCase(),
            new Error('Unknown error'),
          );
    }
  }
}
