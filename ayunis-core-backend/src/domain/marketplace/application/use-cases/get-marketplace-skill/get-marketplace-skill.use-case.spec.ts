import { GetMarketplaceSkillUseCase } from './get-marketplace-skill.use-case';
import { GetMarketplaceSkillQuery } from './get-marketplace-skill.query';
import type { MarketplaceClient } from '../../ports/marketplace-client.port';
import {
  MarketplaceSkillNotFoundError,
  MarketplaceUnavailableError,
} from '../../marketplace.errors';
import type { SkillResponseDto } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';

describe('GetMarketplaceSkillUseCase', () => {
  let useCase: GetMarketplaceSkillUseCase;
  let marketplaceClient: jest.Mocked<MarketplaceClient>;

  const mockSkill: SkillResponseDto = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    identifier: 'meeting-summarizer',
    name: 'Meeting Summarizer',
    shortDescription: 'Summarize meetings and extract action items',
    aiDescription:
      'Activate this skill when the user wants to summarize meeting notes or extract action items.',
    instructions:
      'You are a meeting summarization assistant. When activated, analyze the provided meeting notes...',
    skillCategoryId: '660e8400-e29b-41d4-a716-446655440001',
    iconUrl: 'https://marketplace.ayunis.de/icons/meeting-summarizer.png',
    featured: true,
    published: true,
    preInstalled: false,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-02-10T14:30:00.000Z',
  };

  beforeEach(() => {
    marketplaceClient = {
      getSkillByIdentifier: jest.fn(),
    } as jest.Mocked<MarketplaceClient>;

    useCase = new GetMarketplaceSkillUseCase(marketplaceClient);
  });

  it('should return skill details when skill is found', async () => {
    marketplaceClient.getSkillByIdentifier.mockResolvedValue(mockSkill);

    const result = await useCase.execute(
      new GetMarketplaceSkillQuery('meeting-summarizer'),
    );

    expect(result).toEqual(mockSkill);
    expect(marketplaceClient.getSkillByIdentifier).toHaveBeenCalledWith(
      'meeting-summarizer',
    );
  });

  it('should throw MarketplaceSkillNotFoundError when skill is not found', async () => {
    marketplaceClient.getSkillByIdentifier.mockResolvedValue(null);

    await expect(
      useCase.execute(new GetMarketplaceSkillQuery('nonexistent-skill')),
    ).rejects.toThrow(MarketplaceSkillNotFoundError);
  });

  it('should throw MarketplaceUnavailableError when marketplace service fails', async () => {
    marketplaceClient.getSkillByIdentifier.mockRejectedValue(
      new Error('Connection refused'),
    );

    await expect(
      useCase.execute(new GetMarketplaceSkillQuery('meeting-summarizer')),
    ).rejects.toThrow(MarketplaceUnavailableError);
  });
});
