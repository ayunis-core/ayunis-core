import { InstallSkillFromMarketplaceUseCase } from './install-skill-from-marketplace.use-case';
import { InstallSkillFromMarketplaceCommand } from './install-skill-from-marketplace.command';
import type { ContextService } from 'src/common/context/services/context.service';
import {
  MarketplaceSkillNotFoundError,
  MarketplaceUnavailableError,
} from 'src/domain/marketplace/application/marketplace.errors';
import { MarketplaceInstallFailedError } from '../../skills.errors';
import { Skill } from '../../../domain/skill.entity';
import type { UUID } from 'crypto';
import type { MarketplaceSkillInstallationService } from '../../services/marketplace-skill-installation.service';

describe('InstallSkillFromMarketplaceUseCase', () => {
  let useCase: InstallSkillFromMarketplaceUseCase;
  let skillInstallationService: jest.Mocked<MarketplaceSkillInstallationService>;
  let contextService: jest.Mocked<ContextService>;

  const userId = '550e8400-e29b-41d4-a716-446655440000' as UUID;

  const installedSkill = new Skill({
    name: 'Meeting Summarizer',
    shortDescription: 'Summarize meetings and extract action items',
    instructions:
      'You are a meeting summarization assistant. Analyze meeting notes and produce a summary.',
    marketplaceIdentifier: 'meeting-summarizer',
    userId,
  });

  beforeEach(() => {
    skillInstallationService = {
      installFromMarketplace: jest.fn(),
    } as unknown as jest.Mocked<MarketplaceSkillInstallationService>;

    contextService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ContextService>;

    useCase = new InstallSkillFromMarketplaceUseCase(
      skillInstallationService,
      contextService,
    );
  });

  it('should delegate to MarketplaceSkillInstallationService and return the created skill', async () => {
    contextService.get.mockReturnValue(userId);
    skillInstallationService.installFromMarketplace.mockResolvedValue(
      installedSkill,
    );

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
    expect(
      skillInstallationService.installFromMarketplace,
    ).toHaveBeenCalledWith('meeting-summarizer', userId);
  });

  it('should propagate MarketplaceSkillNotFoundError when skill is not found', async () => {
    contextService.get.mockReturnValue(userId);
    skillInstallationService.installFromMarketplace.mockRejectedValue(
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
    skillInstallationService.installFromMarketplace.mockRejectedValue(
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
    skillInstallationService.installFromMarketplace.mockRejectedValue(
      new Error('Database error'),
    );

    await expect(
      useCase.execute(
        new InstallSkillFromMarketplaceCommand('meeting-summarizer'),
      ),
    ).rejects.toThrow(MarketplaceInstallFailedError);
  });
});
