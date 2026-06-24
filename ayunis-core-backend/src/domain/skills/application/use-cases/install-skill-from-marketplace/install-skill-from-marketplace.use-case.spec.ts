import { InstallSkillFromMarketplaceUseCase } from './install-skill-from-marketplace.use-case';
import { InstallSkillFromMarketplaceCommand } from './install-skill-from-marketplace.command';
import type { ContextService } from 'src/common/context/services/context.service';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import {
  MarketplaceSkillNotFoundError,
  MarketplaceUnavailableError,
} from 'src/domain/marketplace/application/marketplace.errors';
import { MarketplaceInstallFailedError } from '../../skills.errors';
import { Skill } from '../../../domain/skill.entity';
import type { UUID } from 'crypto';
import type { MarketplaceSkillInstallationService } from '../../services/marketplace-skill-installation.service';
import { MarketplaceSkillInstalledEvent } from '../../events/marketplace-skill-installed.event';

describe('InstallSkillFromMarketplaceUseCase', () => {
  let useCase: InstallSkillFromMarketplaceUseCase;
  let skillInstallationService: jest.Mocked<MarketplaceSkillInstallationService>;
  let contextService: jest.Mocked<ContextService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const userId = '550e8400-e29b-41d4-a716-446655440000' as UUID;
  const orgId = '660e8400-e29b-41d4-a716-446655440001' as UUID;

  const mockAuthenticatedContext = () => {
    contextService.get.mockImplementation((key) => {
      if (key === 'userId') return userId;
      if (key === 'orgId') return orgId;
      return undefined;
    });
  };

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

    eventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<EventEmitter2>;

    useCase = new InstallSkillFromMarketplaceUseCase(
      skillInstallationService,
      contextService,
      eventEmitter,
    );
  });

  it('should delegate to MarketplaceSkillInstallationService and return the created skill', async () => {
    mockAuthenticatedContext();
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
    mockAuthenticatedContext();
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
    mockAuthenticatedContext();
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
    mockAuthenticatedContext();
    skillInstallationService.installFromMarketplace.mockRejectedValue(
      new Error('Database error'),
    );

    await expect(
      useCase.execute(
        new InstallSkillFromMarketplaceCommand('meeting-summarizer'),
      ),
    ).rejects.toThrow(MarketplaceInstallFailedError);
  });

  it('should emit MarketplaceSkillInstalledEvent with the canonical identifier on success', async () => {
    mockAuthenticatedContext();
    skillInstallationService.installFromMarketplace.mockResolvedValue(
      installedSkill,
    );

    await useCase.execute(
      new InstallSkillFromMarketplaceCommand('meeting-summarizer'),
    );

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      MarketplaceSkillInstalledEvent.EVENT_NAME,
      expect.objectContaining({
        userId,
        orgId,
        identifier: 'meeting-summarizer',
      }),
    );
  });

  it('should not emit an event when the install fails', async () => {
    mockAuthenticatedContext();
    skillInstallationService.installFromMarketplace.mockRejectedValue(
      new MarketplaceSkillNotFoundError('nonexistent-skill'),
    );

    await expect(
      useCase.execute(
        new InstallSkillFromMarketplaceCommand('nonexistent-skill'),
      ),
    ).rejects.toThrow(MarketplaceSkillNotFoundError);

    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });
});
