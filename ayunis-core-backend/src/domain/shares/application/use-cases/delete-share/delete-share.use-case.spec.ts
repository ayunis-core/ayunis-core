// Mock the Transactional decorator
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (target: any, propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeleteShareUseCase } from './delete-share.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { SharesRepository } from '../../ports/shares-repository.port';
import { ShareDeletedEvent } from '../../events/share-deleted.event';
import { SharedEntityType } from '../../../domain/value-objects/shared-entity-type.enum';
import { ShareScopeType } from '../../../domain/value-objects/share-scope-type.enum';
import { AgentShare, SkillShare } from '../../../domain/share.entity';
import {
  OrgShareScope,
  TeamShareScope,
} from '../../../domain/share-scope.entity';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { randomUUID } from 'crypto';

describe('DeleteShareUseCase', () => {
  let useCase: DeleteShareUseCase;
  let contextService: ContextService;
  let repository: SharesRepository;
  let eventEmitter: EventEmitter2;

  const mockUserId = randomUUID();
  const mockOrgId = randomUUID();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteShareUseCase,
        {
          provide: ContextService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: SharesRepository,
          useValue: {
            findById: jest.fn(),
            delete: jest.fn(),
            findByEntityIdAndType: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<DeleteShareUseCase>(DeleteShareUseCase);
    contextService = module.get<ContextService>(ContextService);
    repository = module.get<SharesRepository>(SharesRepository);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should emit event with empty remainingScopes when no other shares exist for a skill', async () => {
    const skillId = randomUUID();
    const share = new SkillShare({
      skillId,
      scope: new OrgShareScope({ orgId: mockOrgId }),
      ownerId: mockUserId,
    });

    (contextService.get as jest.Mock).mockImplementation((key: string) =>
      key === 'orgId' ? mockOrgId : mockUserId,
    );
    (repository.findById as jest.Mock).mockResolvedValue(share);
    (repository.delete as jest.Mock).mockResolvedValue(undefined);
    (repository.findByEntityIdAndType as jest.Mock).mockResolvedValue([]);

    await useCase.execute(share.id);

    expect(repository.delete).toHaveBeenCalledWith(share);
    expect(repository.findByEntityIdAndType).toHaveBeenCalledWith(
      skillId,
      SharedEntityType.SKILL,
    );

    const emittedEvent = (eventEmitter.emit as jest.Mock).mock.calls[0][1];
    expect(emittedEvent.entityType).toBe(SharedEntityType.SKILL);
    expect(emittedEvent.entityId).toBe(skillId);
    expect(emittedEvent.ownerId).toBe(mockUserId);
    expect(emittedEvent.orgId).toBe(mockOrgId);
    expect(emittedEvent.remainingScopes).toEqual([]);
  });

  it('should emit event with remainingScopes when other shares still exist for the skill', async () => {
    const skillId = randomUUID();
    const teamId = randomUUID();
    const share = new SkillShare({
      skillId,
      scope: new OrgShareScope({ orgId: mockOrgId }),
      ownerId: mockUserId,
    });

    const remainingShare = new SkillShare({
      skillId,
      scope: new TeamShareScope({ teamId }),
      ownerId: mockUserId,
    });

    (contextService.get as jest.Mock).mockImplementation((key: string) =>
      key === 'orgId' ? mockOrgId : mockUserId,
    );
    (repository.findById as jest.Mock).mockResolvedValue(share);
    (repository.delete as jest.Mock).mockResolvedValue(undefined);
    (repository.findByEntityIdAndType as jest.Mock).mockResolvedValue([
      remainingShare,
    ]);

    await useCase.execute(share.id);

    const emittedEvent = (eventEmitter.emit as jest.Mock).mock.calls[0][1];
    expect(emittedEvent.remainingScopes).toEqual([
      { scopeType: ShareScopeType.TEAM, scopeId: teamId },
    ]);
  });

  it('should delete the share and emit ShareDeletedEvent for an agent share', async () => {
    const agentId = randomUUID();
    const share = new AgentShare({
      agentId,
      scope: new OrgShareScope({ orgId: mockOrgId }),
      ownerId: mockUserId,
    });

    (contextService.get as jest.Mock).mockImplementation((key: string) =>
      key === 'orgId' ? mockOrgId : mockUserId,
    );
    (repository.findById as jest.Mock).mockResolvedValue(share);
    (repository.delete as jest.Mock).mockResolvedValue(undefined);
    (repository.findByEntityIdAndType as jest.Mock).mockResolvedValue([]);

    await useCase.execute(share.id);

    expect(repository.delete).toHaveBeenCalledWith(share);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      ShareDeletedEvent.EVENT_NAME,
      expect.any(ShareDeletedEvent),
    );

    const emittedEvent = (eventEmitter.emit as jest.Mock).mock.calls[0][1];
    expect(emittedEvent.entityType).toBe(SharedEntityType.AGENT);
    expect(emittedEvent.entityId).toBe(agentId);
    expect(emittedEvent.ownerId).toBe(mockUserId);
    expect(emittedEvent.remainingScopes).toEqual([]);
  });

  it('should throw UnauthorizedAccessError when user is not authenticated', async () => {
    (contextService.get as jest.Mock).mockReturnValue(null);

    await expect(useCase.execute(randomUUID())).rejects.toThrow(
      UnauthorizedAccessError,
    );
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('should throw when share does not exist', async () => {
    (contextService.get as jest.Mock).mockReturnValue(mockUserId);
    (repository.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute(randomUUID())).rejects.toThrow();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedAccessError when user does not own the share', async () => {
    const otherUserId = randomUUID();
    const share = new AgentShare({
      agentId: randomUUID(),
      scope: new OrgShareScope({ orgId: mockOrgId }),
      ownerId: otherUserId,
    });

    (contextService.get as jest.Mock).mockReturnValue(mockUserId);
    (repository.findById as jest.Mock).mockResolvedValue(share);

    await expect(useCase.execute(share.id)).rejects.toThrow(
      UnauthorizedAccessError,
    );
    expect(repository.delete).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
