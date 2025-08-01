import { Injectable, Logger } from '@nestjs/common';
import { GetAvailableProvidersQuery } from './get-available-providers.query';
import { EmbeddingsProviderRegistry } from '../../embeddings-provider.registry';
import { EmbeddingsProvider } from '../../../domain/embeddings-provider.enum';

@Injectable()
export class GetAvailableProvidersUseCase {
  private readonly logger = new Logger(GetAvailableProvidersUseCase.name);

  constructor(private readonly providerRegistry: EmbeddingsProviderRegistry) {}

  execute(query: GetAvailableProvidersQuery): EmbeddingsProvider[] {
    this.logger.log('execute', query);
    return this.providerRegistry.getAvailableProviders();
  }
}
