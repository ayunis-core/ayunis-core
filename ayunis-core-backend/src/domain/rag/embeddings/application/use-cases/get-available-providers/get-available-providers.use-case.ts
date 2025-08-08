import { Injectable, Logger } from '@nestjs/common';
import { GetAvailableProvidersQuery } from './get-available-providers.query';
import { EmbeddingsHandlerRegistry } from '../../embeddings-handler.registry';
import { EmbeddingsProvider } from '../../../domain/embeddings-provider.enum';

@Injectable()
export class GetAvailableProvidersUseCase {
  private readonly logger = new Logger(GetAvailableProvidersUseCase.name);

  constructor(private readonly providerRegistry: EmbeddingsHandlerRegistry) {}

  execute(query: GetAvailableProvidersQuery): EmbeddingsProvider[] {
    this.logger.log('execute', query);
    return this.providerRegistry.getAvailableProviders();
  }
}
