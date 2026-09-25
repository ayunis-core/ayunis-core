import type {
  IntegrationListResponseDto,
  IntegrationResponseDto,
  SkillCategoryResponseDto,
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

  /** Every published skill, across all catalogue pages. */
  abstract listSkills(): Promise<SkillListResponseDto[]>;

  /** Every published integration, across all catalogue pages. */
  abstract listIntegrations(): Promise<IntegrationListResponseDto[]>;

  abstract listCategories(): Promise<SkillCategoryResponseDto[]>;
}
