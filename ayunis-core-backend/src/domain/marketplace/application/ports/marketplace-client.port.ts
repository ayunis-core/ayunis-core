import type {
  IntegrationResponseDto,
  SkillListResponseDto,
  SkillResponseDto,
} from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';

export abstract class MarketplaceClient {
  abstract getSkillByIdentifier(
    identifier: string,
  ): Promise<SkillResponseDto | null>;

  abstract getPreInstalledSkills(): Promise<SkillListResponseDto[]>;

  abstract getIntegrationByIdentifier(
    identifier: string,
  ): Promise<IntegrationResponseDto | null>;
}
