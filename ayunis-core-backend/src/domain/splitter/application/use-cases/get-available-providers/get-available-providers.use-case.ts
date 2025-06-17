import { Injectable, Logger } from '@nestjs/common';
import { SplitterProvider } from '../../../domain/splitter-provider.enum';
import { SplitterProviderRegistry } from '../../splitter-provider.registry';
import { GetAvailableProvidersQuery } from './get-available-providers.query';

@Injectable()
export class GetAvailableProvidersUseCase {
  private readonly logger = new Logger(GetAvailableProvidersUseCase.name);

  constructor(private readonly providerRegistry: SplitterProviderRegistry) {}

  execute(query: GetAvailableProvidersQuery): SplitterProvider[] {
    this.logger.debug('Getting available splitter providers');
    return this.providerRegistry.getAvailableProviders();
  }
}
