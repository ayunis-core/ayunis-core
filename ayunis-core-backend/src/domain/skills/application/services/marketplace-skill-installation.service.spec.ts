import { MarketplaceSkillInstallationService } from './marketplace-skill-installation.service';
import type { GetMarketplaceSkillUseCase } from 'src/domain/marketplace/application/use-cases/get-marketplace-skill/get-marketplace-skill.use-case';
import type { MarketplaceClient } from 'src/domain/marketplace/application/ports/marketplace-client.port';
import type { CreateSkillWithUniqueNameUseCase } from '../use-cases/create-skill-with-unique-name/create-skill-with-unique-name.use-case';
import type {
  SkillListResponseDto,
  SkillResponseDto,
} from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { Skill } from '../../domain/skill.entity';
import type { UUID } from 'crypto';
import { MarketplaceSkillNotFoundError } from 'src/domain/marketplace/application/marketplace.errors';
import { CreateSkillWithUniqueNameCommand } from '../use-cases/create-skill-with-unique-name/create-skill-with-unique-name.command';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000' as UUID;

const marketplaceSkill: SkillResponseDto = {
  id: 'mp-skill-id',
  identifier: 'meeting-summarizer',
  name: 'Meeting Summarizer',
  shortDescription: 'Summarize meetings and extract action items',
  aiDescription: 'AI description for meeting summarizer',
  instructions:
    'You are a meeting summarization assistant. Analyze meeting notes.',
  skillCategoryId: null,
  iconUrl: null,
} as SkillResponseDto;

describe('MarketplaceSkillInstallationService', () => {
  let service: MarketplaceSkillInstallationService;
  let getMarketplaceSkillUseCase: jest.Mocked<GetMarketplaceSkillUseCase>;
  let createSkillWithUniqueNameUseCase: jest.Mocked<CreateSkillWithUniqueNameUseCase>;
  let marketplaceClient: jest.Mocked<MarketplaceClient>;

  beforeEach(() => {
    getMarketplaceSkillUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetMarketplaceSkillUseCase>;

    createSkillWithUniqueNameUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateSkillWithUniqueNameUseCase>;

    marketplaceClient = {
      getPreInstalledSkills: jest.fn(),
      getSkillByIdentifier: jest.fn(),
      getIntegrationByIdentifier: jest.fn(),
    } as jest.Mocked<MarketplaceClient>;

    service = new MarketplaceSkillInstallationService(
      getMarketplaceSkillUseCase,
      createSkillWithUniqueNameUseCase,
      marketplaceClient,
    );
  });

  it('should fetch marketplace skill and delegate creation to CreateSkillWithUniqueNameUseCase', async () => {
    const createdSkill = new Skill({
      name: 'Meeting Summarizer',
      shortDescription: 'Summarize meetings and extract action items',
      instructions:
        'You are a meeting summarization assistant. Analyze meeting notes.',
      marketplaceIdentifier: 'meeting-summarizer',
      userId: USER_ID,
    });

    getMarketplaceSkillUseCase.execute.mockResolvedValue(marketplaceSkill);
    createSkillWithUniqueNameUseCase.execute.mockResolvedValue(createdSkill);

    const result = await service.installFromMarketplace(
      'meeting-summarizer',
      USER_ID,
    );

    expect(result.name).toBe('Meeting Summarizer');
    expect(result.shortDescription).toBe(
      'Summarize meetings and extract action items',
    );
    expect(result.instructions).toBe(
      'You are a meeting summarization assistant. Analyze meeting notes.',
    );
    expect(result.marketplaceIdentifier).toBe('meeting-summarizer');
    expect(result.userId).toBe(USER_ID);
    expect(createSkillWithUniqueNameUseCase.execute).toHaveBeenCalledWith(
      new CreateSkillWithUniqueNameCommand({
        name: 'Meeting Summarizer',
        shortDescription: 'Summarize meetings and extract action items',
        instructions:
          'You are a meeting summarization assistant. Analyze meeting notes.',
        marketplaceIdentifier: 'meeting-summarizer',
        userId: USER_ID,
      }),
    );
  });

  it('should propagate MarketplaceSkillNotFoundError when skill does not exist', async () => {
    getMarketplaceSkillUseCase.execute.mockRejectedValue(
      new MarketplaceSkillNotFoundError('nonexistent-skill'),
    );

    await expect(
      service.installFromMarketplace('nonexistent-skill', USER_ID),
    ).rejects.toThrow(MarketplaceSkillNotFoundError);

    expect(createSkillWithUniqueNameUseCase.execute).not.toHaveBeenCalled();
  });

  it('should propagate creation failure from CreateSkillWithUniqueNameUseCase', async () => {
    getMarketplaceSkillUseCase.execute.mockResolvedValue(marketplaceSkill);
    createSkillWithUniqueNameUseCase.execute.mockRejectedValue(
      new Error('Unique constraint violation'),
    );

    await expect(
      service.installFromMarketplace('meeting-summarizer', USER_ID),
    ).rejects.toThrow('Unique constraint violation');
  });

  describe('installAllPreInstalled', () => {
    const makeSkillSummary = (
      identifier: string,
      name: string,
    ): SkillListResponseDto =>
      ({
        id: `skill-${identifier}`,
        identifier,
        name,
        shortDescription: `Short desc for ${name}`,
        aiDescription: `AI desc for ${name}`,
      }) as SkillListResponseDto;

    const setupInstallMocks = (): void => {
      getMarketplaceSkillUseCase.execute.mockImplementation(async (query) => ({
        ...marketplaceSkill,
        identifier: query.identifier,
        name: query.identifier,
      }));
      createSkillWithUniqueNameUseCase.execute.mockImplementation(
        async (command) =>
          new Skill({
            name: command.name,
            shortDescription: command.shortDescription,
            instructions: command.instructions,
            marketplaceIdentifier: command.marketplaceIdentifier,
            userId: command.userId,
          }),
      );
    };

    it('should install all pre-installed skills and return success count', async () => {
      const skills = [
        makeSkillSummary('email-writer', 'Email Writer'),
        makeSkillSummary('meeting-notes', 'Meeting Notes'),
      ];
      marketplaceClient.getPreInstalledSkills.mockResolvedValue(skills);
      setupInstallMocks();

      const count = await service.installAllPreInstalled(USER_ID);

      expect(count).toBe(2);
      expect(marketplaceClient.getPreInstalledSkills).toHaveBeenCalled();
    });

    it('should return zero when marketplace returns empty array', async () => {
      marketplaceClient.getPreInstalledSkills.mockResolvedValue([]);

      const count = await service.installAllPreInstalled(USER_ID);

      expect(count).toBe(0);
      expect(getMarketplaceSkillUseCase.execute).not.toHaveBeenCalled();
    });

    it('should continue installing remaining skills when one fails', async () => {
      const skills = [
        makeSkillSummary('failing-skill', 'Failing Skill'),
        makeSkillSummary('working-skill', 'Working Skill'),
      ];
      marketplaceClient.getPreInstalledSkills.mockResolvedValue(skills);

      getMarketplaceSkillUseCase.execute
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ...marketplaceSkill,
          identifier: 'working-skill',
          name: 'Working Skill',
        });
      createSkillWithUniqueNameUseCase.execute.mockImplementation(
        async (command) =>
          new Skill({
            name: command.name,
            shortDescription: command.shortDescription,
            instructions: command.instructions,
            marketplaceIdentifier: command.marketplaceIdentifier,
            userId: command.userId,
          }),
      );

      const count = await service.installAllPreInstalled(USER_ID);

      expect(count).toBe(1);
    });

    it('should return zero and not throw when marketplace is unavailable', async () => {
      marketplaceClient.getPreInstalledSkills.mockRejectedValue(
        new Error('Marketplace down'),
      );

      const count = await service.installAllPreInstalled(USER_ID);

      expect(count).toBe(0);
      expect(getMarketplaceSkillUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
