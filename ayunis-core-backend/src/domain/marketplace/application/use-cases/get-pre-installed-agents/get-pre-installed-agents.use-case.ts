import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceClient } from '../../ports/marketplace-client.port';
import { AgentListResponseDto } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { ApplicationError } from 'src/common/errors/base.error';
import { MarketplaceUnavailableError } from '../../marketplace.errors';

@Injectable()
export class GetPreInstalledAgentsUseCase {
  private readonly logger = new Logger(GetPreInstalledAgentsUseCase.name);

  constructor(private readonly marketplaceClient: MarketplaceClient) {}

  async execute(): Promise<AgentListResponseDto[]> {
    this.logger.log('execute');

    try {
      return await this.marketplaceClient.getPreInstalledAgents();
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to fetch pre-installed agents', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new MarketplaceUnavailableError();
    }
  }
}
