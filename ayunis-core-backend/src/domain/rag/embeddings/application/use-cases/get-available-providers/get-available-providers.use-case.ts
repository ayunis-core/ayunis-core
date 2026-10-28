import { Injectable, Logger } from '@nestjs/common';
import { GetAvailableProvidersQuery } from './get-available-providers.query';
import { EmbeddingsHandlerRegistry } from 'src/domain/rag/embeddings/application/embeddings-handler.registry';
import { EmbeddingsProvider } from 'src/domain/rag/embeddings/domain/embeddings-provider.enum';

@Injectable()
export class GetAvailableProvidersUseCase {
  private readonly logger = new Logger(GetAvailableProvidersUseCase.name);

  constructor(private readonly providerRegistry: EmbeddingsHandlerRegistry) {}

  execute(query: GetAvailableProvidersQuery): EmbeddingsProvider[] {
    this.logger.log(query, 'execute');
    return this.providerRegistry.getAvailableProviders();
  }
}
