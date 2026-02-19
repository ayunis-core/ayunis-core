import type { SkillResponseDto } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';

export abstract class MarketplaceClient {
  abstract getSkillByIdentifier(
    identifier: string,
  ): Promise<SkillResponseDto | null>;
}
