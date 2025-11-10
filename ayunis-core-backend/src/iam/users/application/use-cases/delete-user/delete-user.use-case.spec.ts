import { Test, TestingModule } from '@nestjs/testing';
import { DeleteUserUseCase } from './delete-user.use-case';
import { DeleteUserCommand } from './delete-user.command';
import { UsersRepository } from '../../ports/users.repository';
import { UUID } from 'crypto';
import { SendWebhookUseCase } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.use-case';
import {
  UserNotFoundError,
  UserUnauthorizedError,
  CannotDeleteLastAdminError,
} from '../../users.errors';
import { UserRole } from '../../../domain/value-objects/role.object';
import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let mockUsersRepository: Partial<UsersRepository>;
  let mockSendWebhookUseCase: Partial<SendWebhookUseCase>;
  let mockInvitesRepository: Partial<InvitesRepository>;

  beforeEach(async () => {
    mockUsersRepository = {
      delete: jest.fn(),
      findOneById: jest.fn(),
      findManyByOrgId: jest.fn(),
    };
    mockSendWebhookUseCase = {
      execute: jest.fn(),
    };
    mockInvitesRepository = {
      deleteByEmail: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteUserUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: SendWebhookUseCase, useValue: mockSendWebhookUseCase },
        { provide: InvitesRepository, useValue: mockInvitesRepository },
      ],
    }).compile();

    useCase = module.get<DeleteUserUseCase>(DeleteUserUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should allow self-deletion for regular user', async () => {
    const userId = 'user-id' as UUID;
    const orgId = 'org-id' as UUID;
    const command = new DeleteUserCommand({
      userId,
      orgId,
      requestUserId: userId,
    });

    const requestUser = {
      id: userId,
      role: UserRole.USER,
      orgId,
    };

    const userToDelete = {
      id: userId,
      role: UserRole.USER,
      orgId,
    };

    jest
      .spyOn(mockUsersRepository, 'findOneById')
      .mockResolvedValueOnce(requestUser as any)
      .mockResolvedValueOnce(userToDelete as any);
    jest.spyOn(mockUsersRepository, 'delete').mockResolvedValue(undefined);

    await useCase.execute(command);

    expect(mockUsersRepository.delete).toHaveBeenCalledWith(userId);
  });

  it('should allow admin to delete another user', async () => {
    const adminId = 'admin-id' as UUID;
    const userId = 'user-id' as UUID;
    const orgId = 'org-id' as UUID;
    const command = new DeleteUserCommand({
      userId,
      orgId,
      requestUserId: adminId,
    });

    const requestUser = {
      id: adminId,
      role: UserRole.ADMIN,
      orgId,
    };

    const userToDelete = {
      id: userId,
      role: UserRole.USER,
      orgId,
    };

    jest
      .spyOn(mockUsersRepository, 'findOneById')
      .mockResolvedValueOnce(requestUser as any)
      .mockResolvedValueOnce(userToDelete as any);
    jest.spyOn(mockUsersRepository, 'delete').mockResolvedValue(undefined);

    await useCase.execute(command);

    expect(mockUsersRepository.delete).toHaveBeenCalledWith(userId);
  });

  it('should prevent deleting last admin', async () => {
    const adminId = 'admin-id' as UUID;
    const orgId = 'org-id' as UUID;
    const command = new DeleteUserCommand({
      userId: adminId,
      orgId,
      requestUserId: adminId,
    });

    const adminUser = {
      id: adminId,
      role: UserRole.ADMIN,
      orgId,
    };

    jest
      .spyOn(mockUsersRepository, 'findOneById')
      .mockResolvedValueOnce(adminUser as any)
      .mockResolvedValueOnce(adminUser as any);
    jest.spyOn(mockUsersRepository, 'findManyByOrgId').mockResolvedValue([
      adminUser,
    ] as any);

    await expect(useCase.execute(command)).rejects.toThrow(
      CannotDeleteLastAdminError,
    );
    expect(mockUsersRepository.delete).not.toHaveBeenCalled();
  });

  it('should allow deleting admin when there are multiple admins', async () => {
    const adminId1 = 'admin-id-1' as UUID;
    const adminId2 = 'admin-id-2' as UUID;
    const orgId = 'org-id' as UUID;
    const command = new DeleteUserCommand({
      userId: adminId1,
      orgId,
      requestUserId: adminId2,
    });

    const requestUser = {
      id: adminId2,
      role: UserRole.ADMIN,
      orgId,
    };

    const userToDelete = {
      id: adminId1,
      role: UserRole.ADMIN,
      orgId,
    };

    const orgUsers = [requestUser, userToDelete];

    jest
      .spyOn(mockUsersRepository, 'findOneById')
      .mockResolvedValueOnce(requestUser as any)
      .mockResolvedValueOnce(userToDelete as any);
    jest.spyOn(mockUsersRepository, 'findManyByOrgId').mockResolvedValue(
      orgUsers as any,
    );
    jest.spyOn(mockUsersRepository, 'delete').mockResolvedValue(undefined);

    await useCase.execute(command);

    expect(mockUsersRepository.delete).toHaveBeenCalledWith(adminId1);
  });

  it('should throw error when request user not found', async () => {
    const command = new DeleteUserCommand({
      userId: 'user-id' as UUID,
      orgId: 'org-id' as UUID,
      requestUserId: 'request-user-id' as UUID,
    });

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(null);

    await expect(useCase.execute(command)).rejects.toThrow(
      UserNotFoundError,
    );
  });

  it('should throw error when user to delete not found', async () => {
    const command = new DeleteUserCommand({
      userId: 'user-id' as UUID,
      orgId: 'org-id' as UUID,
      requestUserId: 'request-user-id' as UUID,
    });

    const requestUser = {
      id: 'request-user-id' as UUID,
      role: UserRole.ADMIN,
      orgId: 'org-id' as UUID,
    };

    jest
      .spyOn(mockUsersRepository, 'findOneById')
      .mockResolvedValueOnce(requestUser as any)
      .mockResolvedValueOnce(null);

    await expect(useCase.execute(command)).rejects.toThrow(
      UserNotFoundError,
    );
  });

  it('should throw error when regular user tries to delete another user', async () => {
    const regularUserId = 'regular-user-id' as UUID;
    const targetUserId = 'target-user-id' as UUID;
    const orgId = 'org-id' as UUID;
    const command = new DeleteUserCommand({
      userId: targetUserId,
      orgId,
      requestUserId: regularUserId,
    });

    const requestUser = {
      id: regularUserId,
      role: UserRole.USER,
      orgId,
    };

    const userToDelete = {
      id: targetUserId,
      role: UserRole.USER,
      orgId,
    };

    jest
      .spyOn(mockUsersRepository, 'findOneById')
      .mockResolvedValueOnce(requestUser as any)
      .mockResolvedValueOnce(userToDelete as any);

    await expect(useCase.execute(command)).rejects.toThrow(
      UserUnauthorizedError,
    );
    expect(mockUsersRepository.delete).not.toHaveBeenCalled();
  });

  it('should handle repository errors', async () => {
    const userId = 'user-id' as UUID;
    const orgId = 'org-id' as UUID;
    const command = new DeleteUserCommand({
      userId,
      orgId,
      requestUserId: userId,
    });
    const error = new Error('Repository error');

    const user = {
      id: userId,
      role: UserRole.USER,
      orgId,
    };

    jest
      .spyOn(mockUsersRepository, 'findOneById')
      .mockResolvedValueOnce(user as any)
      .mockResolvedValueOnce(user as any);
    jest.spyOn(mockUsersRepository, 'delete').mockRejectedValue(error);

    await expect(useCase.execute(command)).rejects.toThrow('Repository error');
    expect(mockUsersRepository.delete).toHaveBeenCalledWith(userId);
  });
});
