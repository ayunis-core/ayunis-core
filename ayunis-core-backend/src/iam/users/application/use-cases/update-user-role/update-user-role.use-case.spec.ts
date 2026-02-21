import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UpdateUserRoleUseCase } from './update-user-role.use-case';
import { UpdateUserRoleCommand } from './update-user-role.command';
import { UsersRepository } from '../../ports/users.repository';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import type { UUID } from 'crypto';
import { SendWebhookUseCase } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.use-case';
import { UserUnexpectedError } from '../../users.errors';

describe('UpdateUserRoleUseCase', () => {
  let useCase: UpdateUserRoleUseCase;
  let mockUsersRepository: Partial<UsersRepository>;
  let mockSendWebhookUseCase: Partial<SendWebhookUseCase>;

  beforeAll(async () => {
    mockUsersRepository = {
      findOneById: jest.fn(),
      update: jest.fn(),
    };
    mockSendWebhookUseCase = {
      execute: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserRoleUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: SendWebhookUseCase, useValue: mockSendWebhookUseCase },
      ],
    }).compile();

    useCase = module.get<UpdateUserRoleUseCase>(UpdateUserRoleUseCase);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should update user role successfully', async () => {
    const command = new UpdateUserRoleCommand(
      'user-id' as UUID,
      UserRole.ADMIN,
    );
    const mockUser = new User({
      id: 'user-id' as UUID,
      email: 'test@example.com',
      emailVerified: false,
      passwordHash: 'hash',
      role: UserRole.USER,
      orgId: 'org-id' as UUID,
      name: 'Test User',
      hasAcceptedMarketing: false,
    });
    const updatedUser = { ...mockUser, role: UserRole.ADMIN };

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(mockUser);
    jest
      .spyOn(mockUsersRepository, 'update')
      .mockResolvedValue(updatedUser as User);

    const result = await useCase.execute(command);

    expect(mockUsersRepository.findOneById).toHaveBeenCalledWith('user-id');
    expect(mockUser.role).toBe(UserRole.ADMIN);
    expect(mockUsersRepository.update).toHaveBeenCalledWith(mockUser);
    expect(result).toBe(updatedUser);
  });

  it('should handle repository errors when finding user', async () => {
    const command = new UpdateUserRoleCommand(
      'user-id' as UUID,
      UserRole.ADMIN,
    );
    const error = new Error('User not found');

    jest.spyOn(mockUsersRepository, 'findOneById').mockRejectedValue(error);

    await expect(useCase.execute(command)).rejects.toThrow();
    await expect(useCase.execute(command)).rejects.toThrow();
    expect(mockUsersRepository.findOneById).toHaveBeenCalledWith('user-id');
    expect(mockUsersRepository.update).not.toHaveBeenCalled();
  });

  it('should handle repository errors when updating user', async () => {
    const command = new UpdateUserRoleCommand(
      'user-id' as UUID,
      UserRole.ADMIN,
    );
    const mockUser = new User({
      id: 'user-id' as UUID,
      email: 'test@example.com',
      emailVerified: false,
      passwordHash: 'hash',
      role: UserRole.USER,
      orgId: 'org-id' as UUID,
      name: 'Test User',
      hasAcceptedMarketing: false,
    });
    const updateError = new Error('Update failed');

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(mockUser);
    jest.spyOn(mockUsersRepository, 'update').mockRejectedValue(updateError);

    await expect(useCase.execute(command)).rejects.toThrow(UserUnexpectedError);
    await expect(useCase.execute(command)).rejects.toThrow(
      'An unexpected error occurred while updating user role',
    );
    expect(mockUsersRepository.findOneById).toHaveBeenCalledWith('user-id');
    expect(mockUsersRepository.update).toHaveBeenCalledWith(mockUser);
  });
});
