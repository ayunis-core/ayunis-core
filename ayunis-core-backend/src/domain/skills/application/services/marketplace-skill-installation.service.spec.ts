import { MarketplaceSkillInstallationService } from './marketplace-skill-installation.service';
import type { GetMarketplaceSkillUseCase } from 'src/domain/marketplace/application/use-cases/get-marketplace-skill/get-marketplace-skill.use-case';
import type { MarketplaceClient } from 'src/domain/marketplace/application/ports/marketplace-client.port';
import type { SkillRepository } from '../ports/skill.repository';
import type {
  SkillListResponseDto,
  SkillResponseDto,
} from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { Skill } from '../../domain/skill.entity';
import type { UUID } from 'crypto';
import { MarketplaceSkillNotFoundError } from 'src/domain/marketplace/application/marketplace.errors';

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
  let skillRepository: jest.Mocked<SkillRepository>;
  let marketplaceClient: jest.Mocked<MarketplaceClient>;

  beforeEach(() => {
    getMarketplaceSkillUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetMarketplaceSkillUseCase>;

    skillRepository = {
      create: jest.fn(),
      findByNameAndOwner: jest.fn(),
      activateSkill: jest.fn(),
    } as unknown as jest.Mocked<SkillRepository>;

    marketplaceClient = {
      getPreInstalledSkills: jest.fn(),
      getSkillByIdentifier: jest.fn(),
      getIntegrationByIdentifier: jest.fn(),
    } as jest.Mocked<MarketplaceClient>;

    service = new MarketplaceSkillInstallationService(
      getMarketplaceSkillUseCase,
      skillRepository,
      marketplaceClient,
    );
  });

  it('should install a marketplace skill, create it, and activate it', async () => {
    getMarketplaceSkillUseCase.execute.mockResolvedValue(marketplaceSkill);
    skillRepository.findByNameAndOwner.mockResolvedValue(null);
    skillRepository.create.mockImplementation(async (skill: Skill) => skill);

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
    expect(skillRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Meeting Summarizer' }),
    );
    expect(skillRepository.activateSkill).toHaveBeenCalledWith(
      result.id,
      USER_ID,
    );
  });

  it('should append a numeric suffix when the name already exists', async () => {
    getMarketplaceSkillUseCase.execute.mockResolvedValue(marketplaceSkill);

    const existingSkill = new Skill({
      name: 'Meeting Summarizer',
      shortDescription: 'Existing',
      instructions: 'Existing instructions',
      userId: USER_ID,
    });

    skillRepository.findByNameAndOwner
      .mockResolvedValueOnce(existingSkill) // "Meeting Summarizer" taken
      .mockResolvedValueOnce(null); // "Meeting Summarizer 2" available

    skillRepository.create.mockImplementation(async (skill: Skill) => skill);

    const result = await service.installFromMarketplace(
      'meeting-summarizer',
      USER_ID,
    );

    expect(result.name).toBe('Meeting Summarizer 2');
    expect(skillRepository.findByNameAndOwner).toHaveBeenCalledTimes(2);
    expect(skillRepository.findByNameAndOwner).toHaveBeenCalledWith(
      'Meeting Summarizer',
      USER_ID,
    );
    expect(skillRepository.findByNameAndOwner).toHaveBeenCalledWith(
      'Meeting Summarizer 2',
      USER_ID,
    );
  });

  it('should propagate MarketplaceSkillNotFoundError when skill does not exist', async () => {
    getMarketplaceSkillUseCase.execute.mockRejectedValue(
      new MarketplaceSkillNotFoundError('nonexistent-skill'),
    );

    await expect(
      service.installFromMarketplace('nonexistent-skill', USER_ID),
    ).rejects.toThrow(MarketplaceSkillNotFoundError);

    expect(skillRepository.create).not.toHaveBeenCalled();
  });

  it('should propagate repository create failure', async () => {
    getMarketplaceSkillUseCase.execute.mockResolvedValue(marketplaceSkill);
    skillRepository.findByNameAndOwner.mockResolvedValue(null);
    skillRepository.create.mockRejectedValue(
      new Error('Unique constraint violation'),
    );

    await expect(
      service.installFromMarketplace('meeting-summarizer', USER_ID),
    ).rejects.toThrow('Unique constraint violation');

    expect(skillRepository.activateSkill).not.toHaveBeenCalled();
  });

  it('should throw after exceeding maximum name resolution attempts', async () => {
    getMarketplaceSkillUseCase.execute.mockResolvedValue(marketplaceSkill);

    const existingSkill = new Skill({
      name: 'Meeting Summarizer',
      shortDescription: 'Existing',
      instructions: 'Existing instructions',
      userId: USER_ID,
    });

    // All names taken — returns existing skill every time
    skillRepository.findByNameAndOwner.mockResolvedValue(existingSkill);

    await expect(
      service.installFromMarketplace('meeting-summarizer', USER_ID),
    ).rejects.toThrow(/Could not resolve unique name/);

    expect(skillRepository.create).not.toHaveBeenCalled();
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
      skillRepository.findByNameAndOwner.mockResolvedValue(null);
      skillRepository.create.mockImplementation(async (skill: Skill) => skill);
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
      skillRepository.findByNameAndOwner.mockResolvedValue(null);
      skillRepository.create.mockImplementation(async (skill: Skill) => skill);

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
