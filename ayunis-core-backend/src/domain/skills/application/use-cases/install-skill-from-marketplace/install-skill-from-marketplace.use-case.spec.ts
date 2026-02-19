import { InstallSkillFromMarketplaceUseCase } from './install-skill-from-marketplace.use-case';
import { InstallSkillFromMarketplaceCommand } from './install-skill-from-marketplace.command';
import type { GetMarketplaceSkillUseCase } from 'src/domain/marketplace/application/use-cases/get-marketplace-skill/get-marketplace-skill.use-case';
import type { SkillRepository } from '../../ports/skill.repository';
import type { ContextService } from 'src/common/context/services/context.service';
import type { SkillResponseDto } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import {
  MarketplaceSkillNotFoundError,
  MarketplaceUnavailableError,
} from 'src/domain/marketplace/application/marketplace.errors';
import { MarketplaceInstallFailedError } from '../../skills.errors';
import { Skill } from '../../../domain/skill.entity';
import type { UUID } from 'crypto';

describe('InstallSkillFromMarketplaceUseCase', () => {
  let useCase: InstallSkillFromMarketplaceUseCase;
  let getMarketplaceSkillUseCase: jest.Mocked<GetMarketplaceSkillUseCase>;
  let skillRepository: jest.Mocked<SkillRepository>;
  let contextService: jest.Mocked<ContextService>;

  const userId = '550e8400-e29b-41d4-a716-446655440000' as UUID;

  const marketplaceSkill: SkillResponseDto = {
    id: '660e8400-e29b-41d4-a716-446655440001',
    identifier: 'meeting-summarizer',
    name: 'Meeting Summarizer',
    shortDescription: 'Summarize meetings and extract action items',
    aiDescription:
      'Activate this skill when the user wants to summarize meeting notes.',
    instructions:
      'You are a meeting summarization assistant. Analyze meeting notes and produce a summary.',
    skillCategoryId: '770e8400-e29b-41d4-a716-446655440002',
    iconUrl: 'https://marketplace.ayunis.de/icons/meeting-summarizer.png',
    featured: true,
    published: true,
    preInstalled: false,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-02-10T14:30:00.000Z',
  };

  beforeEach(() => {
    getMarketplaceSkillUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetMarketplaceSkillUseCase>;

    skillRepository = {
      create: jest.fn(),
      activateSkill: jest.fn(),
      findByNameAndOwner: jest.fn(),
    } as unknown as jest.Mocked<SkillRepository>;

    contextService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ContextService>;

    useCase = new InstallSkillFromMarketplaceUseCase(
      getMarketplaceSkillUseCase,
      skillRepository,
      contextService,
    );
  });

  it('should create a skill with marketplace data and activate it', async () => {
    contextService.get.mockReturnValue(userId);
    getMarketplaceSkillUseCase.execute.mockResolvedValue(marketplaceSkill);
    skillRepository.findByNameAndOwner.mockResolvedValue(null);
    skillRepository.create.mockImplementation(async (skill: Skill) => skill);
    skillRepository.activateSkill.mockResolvedValue(undefined);

    const result = await useCase.execute(
      new InstallSkillFromMarketplaceCommand('meeting-summarizer'),
    );

    expect(result.name).toBe('Meeting Summarizer');
    expect(result.shortDescription).toBe(
      'Summarize meetings and extract action items',
    );
    expect(result.instructions).toBe(
      'You are a meeting summarization assistant. Analyze meeting notes and produce a summary.',
    );
    expect(result.marketplaceIdentifier).toBe('meeting-summarizer');
    expect(result.userId).toBe(userId);
    expect(skillRepository.create).toHaveBeenCalled();
    expect(skillRepository.activateSkill).toHaveBeenCalledWith(
      result.id,
      userId,
    );
  });

  it('should propagate MarketplaceSkillNotFoundError when skill is not found', async () => {
    contextService.get.mockReturnValue(userId);
    getMarketplaceSkillUseCase.execute.mockRejectedValue(
      new MarketplaceSkillNotFoundError('nonexistent-skill'),
    );

    await expect(
      useCase.execute(
        new InstallSkillFromMarketplaceCommand('nonexistent-skill'),
      ),
    ).rejects.toThrow(MarketplaceSkillNotFoundError);
  });

  it('should propagate MarketplaceUnavailableError when marketplace is down', async () => {
    contextService.get.mockReturnValue(userId);
    getMarketplaceSkillUseCase.execute.mockRejectedValue(
      new MarketplaceUnavailableError(),
    );

    await expect(
      useCase.execute(
        new InstallSkillFromMarketplaceCommand('meeting-summarizer'),
      ),
    ).rejects.toThrow(MarketplaceUnavailableError);
  });

  it('should throw UnauthorizedException when user is not authenticated', async () => {
    contextService.get.mockReturnValue(undefined);

    await expect(
      useCase.execute(
        new InstallSkillFromMarketplaceCommand('meeting-summarizer'),
      ),
    ).rejects.toThrow('User not authenticated');
  });

  it('should throw MarketplaceInstallFailedError on unexpected errors', async () => {
    contextService.get.mockReturnValue(userId);
    getMarketplaceSkillUseCase.execute.mockResolvedValue(marketplaceSkill);
    skillRepository.findByNameAndOwner.mockResolvedValue(null);
    skillRepository.create.mockRejectedValue(new Error('Database error'));

    await expect(
      useCase.execute(
        new InstallSkillFromMarketplaceCommand('meeting-summarizer'),
      ),
    ).rejects.toThrow(MarketplaceInstallFailedError);
  });

  it('should append suffix when skill name already exists', async () => {
    contextService.get.mockReturnValue(userId);
    getMarketplaceSkillUseCase.execute.mockResolvedValue(marketplaceSkill);
    const existingSkill = new Skill({
      name: 'Meeting Summarizer',
      shortDescription: 'Existing skill',
      instructions: 'Existing instructions',
      userId,
    });
    skillRepository.findByNameAndOwner
      .mockResolvedValueOnce(existingSkill)
      .mockResolvedValueOnce(null);
    skillRepository.create.mockImplementation(async (skill: Skill) => skill);
    skillRepository.activateSkill.mockResolvedValue(undefined);

    const result = await useCase.execute(
      new InstallSkillFromMarketplaceCommand('meeting-summarizer'),
    );

    expect(result.name).toBe('Meeting Summarizer 2');
  });
});
