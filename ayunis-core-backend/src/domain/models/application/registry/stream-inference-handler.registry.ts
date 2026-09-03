import { Injectable, Logger } from '@nestjs/common';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { StreamInferenceHandler } from 'src/domain/models/application/ports/stream-inference.handler';
import { ModelProviderNotSupportedError } from 'src/domain/models/application/models.errors';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StreamInferenceHandlerRegistry {
  private readonly logger = new Logger(StreamInferenceHandlerRegistry.name);

  private readonly handlers = new Map<ModelProvider, StreamInferenceHandler>();
  private mockHandler: StreamInferenceHandler;

  constructor(private readonly configService: ConfigService) {
    this.logger.log(StreamInferenceHandlerRegistry.name);
    // prebuilt handlers are registered in models.module.ts
  }

  register(provider: ModelProvider, handler: StreamInferenceHandler): void {
    this.handlers.set(provider, handler);
  }

  registerMockHandler(handler: StreamInferenceHandler): void {
    this.mockHandler = handler;
  }

  /**
   * Returns the appropriate streaming inference handler for the given provider.
   * When mock inference is enabled (NODE_ENV=test or MOCK_INFERENCE=true, e.g.
   * e2e stacks), always returns the mock handler to prevent external API calls
   * and eliminate the need for real API keys. This ensures tests are fast,
   * deterministic, and cost-free.
   *
   * @param provider - The model provider (OpenAI, Anthropic, etc.)
   * @returns The streaming inference handler (real or mock based on environment)
   * @throws ModelProviderNotSupportedError if provider not registered (non-mock only)
   */
  getHandler(provider: ModelProvider): StreamInferenceHandler {
    const mockInference = this.configService.get<boolean>('app.mockInference');
    if (mockInference) {
      this.logger.log('Using mock handler for streaming');
      return this.mockHandler;
    }
    const handler = this.handlers.get(provider);
    if (!handler) {
      throw new ModelProviderNotSupportedError(provider);
    }
    return handler;
  }
}
