import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeleteOrgUseCase } from './delete-org.use-case';
import { DeleteOrgCommand } from './delete-org.command';
import { OrgsRepository } from '../../ports/orgs.repository';
import { OrgDeletionFailedError } from '../../orgs.errors';
import { OrgDeletionRequestedEvent } from '../../events/org-deletion-requested.event';
import type { UUID } from 'crypto';

describe('DeleteOrgUseCase', () => {
  let useCase: DeleteOrgUseCase;
  let mockOrgsRepository: { delete: jest.Mock };
  let eventEmitter: { emitAsync: jest.Mock };

  const orgId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeEach(async () => {
    mockOrgsRepository = {
      delete: jest.fn().mockResolvedValue(undefined),
    };
    eventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteOrgUseCase,
        { provide: OrgsRepository, useValue: mockOrgsRepository },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    useCase = module.get<DeleteOrgUseCase>(DeleteOrgUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should delete organization successfully', async () => {
    await useCase.execute(new DeleteOrgCommand(orgId));

    expect(mockOrgsRepository.delete).toHaveBeenCalledWith(orgId);
  });

  it('should emit OrgDeletionRequestedEvent so storage assets are purged', async () => {
    await useCase.execute(new DeleteOrgCommand(orgId));

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      OrgDeletionRequestedEvent.EVENT_NAME,
      expect.objectContaining({ orgId }),
    );
  });

  it('should run deferred cleanup only after the org row is deleted', async () => {
    const callOrder: string[] = [];
    eventEmitter.emitAsync.mockImplementation(
      (_name: string, event: OrgDeletionRequestedEvent) => {
        event.deferCleanup('purge', async () => {
          callOrder.push('cleanup');
        });
        return Promise.resolve([]);
      },
    );
    mockOrgsRepository.delete.mockImplementation(() => {
      callOrder.push('delete');
      return Promise.resolve();
    });

    await useCase.execute(new DeleteOrgCommand(orgId));

    expect(callOrder).toEqual(['delete', 'cleanup']);
  });

  it('should not run deferred cleanup when the row delete fails', async () => {
    const cleanup = jest.fn().mockResolvedValue(undefined);
    eventEmitter.emitAsync.mockImplementation(
      (_name: string, event: OrgDeletionRequestedEvent) => {
        event.deferCleanup('purge', cleanup);
        return Promise.resolve([]);
      },
    );
    mockOrgsRepository.delete.mockRejectedValue(new Error('Database error'));

    await expect(useCase.execute(new DeleteOrgCommand(orgId))).rejects.toThrow(
      OrgDeletionFailedError,
    );
    expect(cleanup).not.toHaveBeenCalled();
  });

  it('should swallow deferred cleanup failures after a successful delete', async () => {
    eventEmitter.emitAsync.mockImplementation(
      (_name: string, event: OrgDeletionRequestedEvent) => {
        event.deferCleanup('purge', () =>
          Promise.reject(new Error('storage unavailable')),
        );
        return Promise.resolve([]);
      },
    );

    await expect(
      useCase.execute(new DeleteOrgCommand(orgId)),
    ).resolves.toBeUndefined();
    expect(mockOrgsRepository.delete).toHaveBeenCalledWith(orgId);
  });

  it('should throw OrgDeletionFailedError for unexpected errors', async () => {
    mockOrgsRepository.delete.mockRejectedValue(new Error('Database error'));

    await expect(useCase.execute(new DeleteOrgCommand(orgId))).rejects.toThrow(
      OrgDeletionFailedError,
    );
  });
});
