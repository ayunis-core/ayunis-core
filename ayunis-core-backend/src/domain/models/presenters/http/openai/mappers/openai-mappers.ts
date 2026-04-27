import { Injectable } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { OpenAIRequestMapper } from './openai-request.mapper';
import { OpenAIResponseMapper } from './openai-response.mapper';
import { OpenAIStreamMapper } from './openai-stream.mapper';
import { OpenAIErrorMapper } from './openai-error.mapper';

/**
 * Bundles the four OpenAI-compat mappers + the ContextService so the
 * controller can take a single presenter-layer dependency for all of them.
 */
@Injectable()
export class OpenAIChatCompletionsMappers {
  constructor(
    public readonly request: OpenAIRequestMapper,
    public readonly response: OpenAIResponseMapper,
    public readonly stream: OpenAIStreamMapper,
    public readonly error: OpenAIErrorMapper,
    public readonly context: ContextService,
  ) {}
}
