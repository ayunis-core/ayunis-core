import { Injectable, Logger } from '@nestjs/common';
import { ModelProvider } from '../../domain/value-objects/model-provider.enum';
import { InferenceHandler } from '../ports/inference.handler';
import { ModelProviderNotSupportedError } from '../models.errors';
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
   * In test environments (NODE_ENV=test), always returns the mock handler
   * to prevent external API calls and eliminate the need for real API keys.
   * This ensures tests are fast, deterministic, and cost-free.
   *
   * @param provider - The model provider (OpenAI, Anthropic, etc.)
   * @returns The inference handler (real or mock based on environment)
   * @throws ModelProviderNotSupportedError if provider not registered (non-test only)
   */
  getHandler(provider: ModelProvider): InferenceHandler {
    this.logger.log('getHandler', provider);
    const isTest = this.configService.get('NODE_ENV') === 'test';
    if (isTest) {
      return this.mockHandler;
    }
    const handler = this.handlers.get(provider);
    if (!handler) {
      this.logger.error('Handler not found', {
        provider,
      });
      throw new ModelProviderNotSupportedError(provider);
    }
    return handler;
  }
}
