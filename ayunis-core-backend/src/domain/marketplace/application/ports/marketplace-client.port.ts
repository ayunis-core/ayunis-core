import { AgentResponseDto } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';

export abstract class MarketplaceClient {
  abstract getAgentByIdentifier(
    identifier: string,
  ): Promise<AgentResponseDto | null>;
}
