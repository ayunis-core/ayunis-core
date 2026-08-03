import type { Message as InferenceMessage } from '@ayunis/inference';
import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { extractTextFromMessage } from 'src/domain/messages/application/utils/message-text-extractor.util';
import type { Message } from 'src/domain/messages/domain/message.entity';
import type { ToolSchema } from 'src/domain/models/domain/value-objects/tool-schema';
import { MapMessagesToInferenceCommand } from 'src/domain/models/application/use-cases/map-messages-to-inference/map-messages-to-inference.command';
import { MapMessagesToInferenceUseCase } from 'src/domain/models/application/use-cases/map-messages-to-inference/map-messages-to-inference.use-case';
import { RunContextBudgetExceededError } from '../runs.errors';
import { CompleteTurnSelector } from './complete-turn-selector';

interface MaterializeRuntimeHistoryParams {
  messages: readonly Message[];
  orgId: UUID;
  tools: readonly ToolSchema[];
  maxTokens: number;
}

@Injectable()
export class RuntimeHistoryMaterializer {
  constructor(
    private readonly completeTurnSelector: CompleteTurnSelector,
    private readonly mapMessagesToInferenceUseCase: MapMessagesToInferenceUseCase,
  ) {}

  async materialize(
    params: MaterializeRuntimeHistoryParams,
  ): Promise<InferenceMessage[]> {
    const selected = this.completeTurnSelector.select(
      params.messages,
      params.maxTokens,
      (message) => extractTextFromMessage(message.content),
    );
    if (selected.length === 0) {
      throw new RunContextBudgetExceededError();
    }
    return this.mapMessagesToInferenceUseCase.execute(
      new MapMessagesToInferenceCommand(selected, params.orgId, params.tools),
    );
  }
}
