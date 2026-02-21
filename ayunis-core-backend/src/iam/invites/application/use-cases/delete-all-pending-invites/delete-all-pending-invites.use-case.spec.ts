import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DeleteAllPendingInvitesUseCase } from './delete-all-pending-invites.use-case';
import { DeleteAllPendingInvitesCommand } from './delete-all-pending-invites.command';
import { InvitesRepository } from '../../ports/invites.repository';

describe('DeleteAllPendingInvitesUseCase', () => {
  let useCase: DeleteAllPendingInvitesUseCase;
  let invitesRepository: jest.Mocked<InvitesRepository>;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174001';

  beforeAll(async () => {
    const mockInvitesRepository = {
      deleteAllPendingByOrg: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteAllPendingInvitesUseCase,
        { provide: InvitesRepository, useValue: mockInvitesRepository },
      ],
    }).compile();

    useCase = module.get<DeleteAllPendingInvitesUseCase>(
      DeleteAllPendingInvitesUseCase,
    );
    invitesRepository = module.get(InvitesRepository);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should delete all pending invites for an organization', async () => {
      const command = new DeleteAllPendingInvitesCommand(mockOrgId);

      invitesRepository.deleteAllPendingByOrg.mockResolvedValue(5);

      const result = await useCase.execute(command);

      expect(result.deletedCount).toBe(5);
      expect(invitesRepository.deleteAllPendingByOrg).toHaveBeenCalledWith(
        mockOrgId,
      );
      expect(invitesRepository.deleteAllPendingByOrg).toHaveBeenCalledTimes(1);
    });

    it('should return zero when no pending invites exist', async () => {
      const command = new DeleteAllPendingInvitesCommand(mockOrgId);

      invitesRepository.deleteAllPendingByOrg.mockResolvedValue(0);

      const result = await useCase.execute(command);

      expect(result.deletedCount).toBe(0);
      expect(invitesRepository.deleteAllPendingByOrg).toHaveBeenCalledWith(
        mockOrgId,
      );
    });

    it('should handle large numbers of deleted invites', async () => {
      const command = new DeleteAllPendingInvitesCommand(mockOrgId);

      invitesRepository.deleteAllPendingByOrg.mockResolvedValue(1000);

      const result = await useCase.execute(command);

      expect(result.deletedCount).toBe(1000);
    });

    it('should propagate repository errors', async () => {
      const command = new DeleteAllPendingInvitesCommand(mockOrgId);

      const repositoryError = new Error('Database connection failed');
      invitesRepository.deleteAllPendingByOrg.mockRejectedValue(
        repositoryError,
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should log execution details', async () => {
      const command = new DeleteAllPendingInvitesCommand(mockOrgId);
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');

      invitesRepository.deleteAllPendingByOrg.mockResolvedValue(3);

      await useCase.execute(command);

      expect(logSpy).toHaveBeenCalledWith('execute', { orgId: mockOrgId });
      expect(debugSpy).toHaveBeenCalledWith('All pending invites deleted', {
        orgId: mockOrgId,
        deletedCount: 3,
      });
    });
  });
});
