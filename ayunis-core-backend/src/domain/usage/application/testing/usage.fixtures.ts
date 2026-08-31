import type { UUID } from 'crypto';
import type { UsageRepository } from 'src/domain/usage/application/ports/usage.repository';

export const TEST_ORGANIZATION_ID =
  '11111111-1111-1111-1111-111111111111' as UUID;
export const TEST_API_KEY_ID = '22222222-2222-2222-2222-222222222222' as UUID;
export const TEST_SECOND_API_KEY_ID =
  '33333333-3333-3333-3333-333333333333' as UUID;

export function createMockUsageRepository(): jest.Mocked<UsageRepository> {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    saveBatch: jest.fn().mockResolvedValue(undefined),
    findByOrganization: jest.fn().mockResolvedValue([]),
    findByUser: jest.fn().mockResolvedValue([]),
    findByModel: jest.fn().mockResolvedValue([]),
    existsByModelId: jest.fn().mockResolvedValue(false),
    getProviderUsage: jest.fn().mockResolvedValue([]),
    getModelDistribution: jest.fn().mockResolvedValue([]),
    getUserUsage: jest.fn(),
    getUsageStats: jest.fn(),
    getUsageCount: jest.fn().mockResolvedValue(0),
    getMonthlyCreditUsage: jest.fn().mockResolvedValue(0),
    getTotalMonthlyCreditUsageForUser: jest.fn().mockResolvedValue(0),
    getTotalMonthlyCreditUsageForUsers: jest.fn().mockResolvedValue(0),
    getMonthlyCreditUsagePerUser: jest.fn().mockResolvedValue(new Map()),
    getTotalMonthlyCreditUsageForApiKey: jest.fn().mockResolvedValue(0),
    getMonthlyCreditUsagePerApiKey: jest.fn().mockResolvedValue(new Map()),
  };
}
