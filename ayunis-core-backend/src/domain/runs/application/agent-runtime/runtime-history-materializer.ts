import type { Message as InferenceMessage } from '@ayunis/inference';
import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import {
  budgetEstimator,
  countMessageTokens,
  getMessageBudget,
  type MessageBudgetParams,
} from 'src/common/token-counter/application/util/context-budget.helper';
import { toBudgetParts } from 'src/domain/messages/application/utils/message-parts.util';
import type { Message } from 'src/domain/messages/domain/message.entity';
import type { ToolSchema } from 'src/domain/models/domain/value-objects/tool-schema';
import { MapMessagesToInferenceCommand } from 'src/domain/models/application/use-cases/map-messages-to-inference/map-messages-to-inference.command';
import { MapMessagesToInferenceUseCase } from 'src/domain/models/application/use-cases/map-messages-to-inference/map-messages-to-inference.use-case';
import { RunContextBudgetExceededError } from 'src/domain/runs/application/runs.errors';
import { selectCompleteTurns } from './complete-turn-selector';

interface MaterializeRuntimeHistoryParams {
  messages: readonly Message[];
  orgId: UUID;
  backendTools: readonly ToolSchema[];
  /** The model call the history is for; its budget is the hook's budget. */
  request: MessageBudgetParams;
}

@Injectable()
export class RuntimeHistoryMaterializer {
  constructor(
    private readonly mapMessagesToInferenceUseCase: MapMessagesToInferenceUseCase,
  ) {}

  async materialize(
    params: MaterializeRuntimeHistoryParams,
  ): Promise<InferenceMessage[]> {
    const estimator = budgetEstimator(params.request.tokenEstimator);
    const { messages } = selectCompleteTurns(params.messages, {
      maxTokens: getMessageBudget(params.request),
      countTokens: (message) =>
        countMessageTokens(estimator, toBudgetParts(message)),
    });
    if (messages.length === 0) {
      throw new RunContextBudgetExceededError();
    }
    return this.mapMessagesToInferenceUseCase.execute(
      new MapMessagesToInferenceCommand(
        messages,
        params.orgId,
        params.backendTools,
      ),
    );
  }
}
