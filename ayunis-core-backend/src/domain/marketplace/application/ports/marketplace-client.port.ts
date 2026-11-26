import type {
  IntegrationListResponseDto,
  IntegrationResponseDto,
  RoutineResponseDto,
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

  /** A published routine; null when it does not exist or is unpublished. */
  abstract getRoutineByIdentifier(
    identifier: string,
  ): Promise<RoutineResponseDto | null>;

  /** Every published skill, across all catalogue pages. */
  abstract listSkills(): Promise<SkillListResponseDto[]>;

  /** Every published integration, across all catalogue pages. */
  abstract listIntegrations(): Promise<IntegrationListResponseDto[]>;

  abstract listCategories(): Promise<SkillCategoryResponseDto[]>;
}
