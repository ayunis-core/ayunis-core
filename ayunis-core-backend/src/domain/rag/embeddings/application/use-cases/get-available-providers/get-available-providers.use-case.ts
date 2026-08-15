import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GetAvailableProvidersQuery } from './get-available-providers.query';
import { EmbeddingsHandlerRegistry } from '../../embeddings-handler.registry';
import { EmbeddingsProvider } from 'src/domain/rag/embeddings/domain/embeddings-provider.enum';

@Injectable()
export class GetAvailableProvidersUseCase {
  constructor(
    @InjectPinoLogger(GetAvailableProvidersUseCase.name)
    private readonly logger: PinoLogger,
    private readonly providerRegistry: EmbeddingsHandlerRegistry,
  ) {}

  execute(query: GetAvailableProvidersQuery): EmbeddingsProvider[] {
    this.logger.info(query, 'execute');
    return this.providerRegistry.getAvailableProviders();
  }
}
