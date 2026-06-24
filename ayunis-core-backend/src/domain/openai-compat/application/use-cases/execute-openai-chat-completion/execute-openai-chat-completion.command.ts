import type { UUID } from 'crypto';
import type { OpenAIChatCompletionRequest } from '../../types/openai-request.types';

export interface ChatCompletionPrincipal {
  userId?: UUID;
  apiKeyId?: UUID;
  orgId: UUID;
}

export class ExecuteOpenAIChatCompletionCommand {
  constructor(
    public readonly request: OpenAIChatCompletionRequest,
    public readonly principal: ChatCompletionPrincipal,
  ) {}
}
