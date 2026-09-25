import type {
  IntegrationListResponseDto,
  SkillCategoryResponseDto,
  SkillListResponseDto,
} from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import type { MarketplaceClient } from 'src/domain/marketplace/application/ports/marketplace-client.port';

export const TEST_SKILL_CATEGORY_ID = 'c0000000-0000-4000-8000-000000000001';

export function aMarketplaceSkillCategory(
  overrides: Partial<SkillCategoryResponseDto> = {},
): SkillCategoryResponseDto {
  return {
    id: TEST_SKILL_CATEGORY_ID,
    name: 'Finanzen',
    description: null,
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function aMarketplaceSkillListEntry(
  overrides: Partial<SkillListResponseDto> = {},
): SkillListResponseDto {
  return {
    id: 'a0000000-0000-4000-8000-000000000001',
    identifier: 'finance-clerk',
    name: 'Finanzsachbearbeitung',
    shortDescription: 'Hilft bei Haushaltsfragen',
    aiDescription: 'Activate for finance clerk tasks',
    skillCategoryId: null,
    iconUrl: null,
    featured: false,
    published: true,
    preInstalled: false,
    ...overrides,
  };
}

export function aMarketplaceIntegrationListEntry(
  overrides: Partial<IntegrationListResponseDto> = {},
): IntegrationListResponseDto {
  return {
    id: 'b0000000-0000-4000-8000-000000000001',
    identifier: 'council-data',
    name: 'Ratsinformationssystem',
    shortDescription: 'Zugriff auf Beschlüsse',
    iconName: null,
    logoUrl: null,
    integrationCategoryId: null,
    featured: false,
    published: true,
    preInstalled: false,
    ...overrides,
  };
}

// Defaults model an empty catalogue; tests override per case.
export function createMockMarketplaceClient(): jest.Mocked<MarketplaceClient> {
  return {
    getSkillByIdentifier: jest.fn().mockResolvedValue(null),
    getPreInstalledSkills: jest.fn().mockResolvedValue([]),
    getIntegrationByIdentifier: jest.fn().mockResolvedValue(null),
    listSkills: jest.fn().mockResolvedValue([]),
    listIntegrations: jest.fn().mockResolvedValue([]),
    listCategories: jest.fn().mockResolvedValue([]),
  };
}
