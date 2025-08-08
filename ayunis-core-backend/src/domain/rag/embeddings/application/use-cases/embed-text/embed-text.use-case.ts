import { Injectable, Logger } from '@nestjs/common';
import { EmbedTextCommand } from './embed-text.command';
import { EmbeddingsHandlerRegistry } from '../../embeddings-handler.registry';
import { Embedding } from '../../../domain/embedding.entity';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class EmbedTextUseCase {
  private readonly logger = new Logger(EmbedTextUseCase.name);

  constructor(private readonly providerRegistry: EmbeddingsHandlerRegistry) {}

  async execute(command: EmbedTextCommand): Promise<Embedding[]> {
    this.logger.log('execute', {
      model: command.model,
    });
    try {
      const handler = this.providerRegistry.getHandler(command.model.provider);

      return handler.embed(command.texts, command.model);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error embedding text', {
        error: error as Error,
      });
      throw error;
    }
  }
}
