import { Injectable, Logger } from '@nestjs/common';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { InferenceHandler } from 'src/domain/models/application/ports/inference.handler';
import { ModelProviderNotSupportedError } from 'src/domain/models/application/models.errors';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InferenceHandlerRegistry {
  private readonly logger = new Logger(InferenceHandlerRegistry.name);

  private readonly handlers = new Map<ModelProvider, InferenceHandler>();
  private mockHandler: InferenceHandler;

  constructor(private readonly configService: ConfigService) {
    this.logger.log(InferenceHandlerRegistry.name);
    // prebuilt handlers are registered in models.module.ts
  }

  register(provider: ModelProvider, handler: InferenceHandler): void {
    this.handlers.set(provider, handler);
  }

  registerMockHandler(handler: InferenceHandler): void {
    this.mockHandler = handler;
  }

  /**
   * Returns the appropriate inference handler for the given provider.
   * When mock inference is enabled (NODE_ENV=test or MOCK_INFERENCE=true, e.g.
   * e2e stacks), always returns the mock handler to prevent external API calls
   * and eliminate the need for real API keys. This ensures tests are fast,
   * deterministic, and cost-free.
   *
   * @param provider - The model provider (OpenAI, Anthropic, etc.)
   * @returns The inference handler (real or mock based on environment)
   * @throws ModelProviderNotSupportedError if provider not registered (non-mock only)
   */
  getHandler(provider: ModelProvider): InferenceHandler {
    const mockInference = this.configService.get<boolean>('app.mockInference');
    if (mockInference) {
      this.logger.log('Using mock handler for non-streaming');
      return this.mockHandler;
    }
    const handler = this.handlers.get(provider);
    if (!handler) {
      this.logger.error(
        {
          provider,
        },
        'Handler not found',
      );
      throw new ModelProviderNotSupportedError(provider);
    }
    return handler;
  }
}
