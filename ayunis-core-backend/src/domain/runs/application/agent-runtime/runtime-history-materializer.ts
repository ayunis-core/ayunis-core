import {
  estimatedTokens,
  type Message as InferenceMessage,
  type ProviderImageLimits,
} from '@ayunis/inference';
import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { extractTextFromMessage } from 'src/domain/messages/application/utils/message-text-extractor.util';
import type { Message } from 'src/domain/messages/domain/message.entity';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import type { ToolSchema } from 'src/domain/models/domain/value-objects/tool-schema';
import { MapMessagesToInferenceCommand } from 'src/domain/models/application/use-cases/map-messages-to-inference/map-messages-to-inference.command';
import { MapMessagesToInferenceUseCase } from 'src/domain/models/application/use-cases/map-messages-to-inference/map-messages-to-inference.use-case';
import {
  ContextBudgetHookFactory,
  type MessageBudgetParams,
} from 'src/domain/runs/application/agent-runtime/hooks/context-budget-hook.factory';
import { RunContextBudgetExceededError } from 'src/domain/runs/application/runs.errors';
import { selectCompleteTurns } from './complete-turn-selector';

interface MaterializeRuntimeHistoryParams {
  messages: readonly Message[];
  orgId: UUID;
  tools: readonly ToolSchema[];
  /** The model call the history is for; its budget is the hook's budget. */
  request: MessageBudgetParams;
  imageLimits?: ProviderImageLimits;
}

@Injectable()
export class RuntimeHistoryMaterializer {
  constructor(
    private readonly mapMessagesToInferenceUseCase: MapMessagesToInferenceUseCase,
    private readonly contextBudgetHookFactory: ContextBudgetHookFactory,
  ) {}

  async materialize(
    params: MaterializeRuntimeHistoryParams,
  ): Promise<InferenceMessage[]> {
    const estimator = params.request.tokens ?? estimatedTokens();
    const { messages } = selectCompleteTurns(params.messages, {
      maxTokens: this.contextBudgetHookFactory.messageBudgetTokens(
        params.request,
      ),
      countTokens: (message) =>
        message.content.reduce(
          (total, content) =>
            total +
            (content.type === MessageContentType.IMAGE
              ? estimator.tokensPerImage
              : estimator.countText(extractTextFromMessage([content]))),
          estimator.tokensPerMessage,
        ),
    });
    if (messages.length === 0) {
      throw new RunContextBudgetExceededError();
    }
    return this.mapMessagesToInferenceUseCase.execute(
      new MapMessagesToInferenceCommand(
        messages,
        params.orgId,
        params.tools,
        params.imageLimits,
      ),
    );
  }
}
