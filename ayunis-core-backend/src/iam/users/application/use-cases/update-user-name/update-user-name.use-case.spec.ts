import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UpdateUserNameUseCase } from './update-user-name.use-case';
import { UpdateUserNameCommand } from './update-user-name.command';
import { UsersRepository } from '../../ports/users.repository';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import type { UUID } from 'crypto';
import { SendWebhookUseCase } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.use-case';

describe('UpdateUserNameUseCase', () => {
  let useCase: UpdateUserNameUseCase;
  let mockUsersRepository: Partial<UsersRepository>;
  let mockSendWebhookUseCase: Partial<SendWebhookUseCase>;

  beforeEach(async () => {
    mockUsersRepository = {
      findOneById: jest.fn(),
      update: jest.fn(),
    };
    mockSendWebhookUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserNameUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: SendWebhookUseCase, useValue: mockSendWebhookUseCase },
      ],
    }).compile();

    useCase = module.get<UpdateUserNameUseCase>(UpdateUserNameUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should update user name successfully', async () => {
    const command = new UpdateUserNameCommand('user-id' as UUID, 'New Name');
    const mockUser = new User({
      id: 'user-id' as UUID,
      email: 'test@example.com',
      emailVerified: false,
      passwordHash: 'hash',
      role: UserRole.USER,
      orgId: 'org-id' as UUID,
      name: 'Old Name',
      hasAcceptedMarketing: false,
    });
    const updatedUser = { ...mockUser, name: 'New Name' };

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(mockUser);
    jest
      .spyOn(mockUsersRepository, 'update')
      .mockResolvedValue(updatedUser as User);

    const result = await useCase.execute(command);

    expect(mockUsersRepository.findOneById).toHaveBeenCalledWith('user-id');
    expect(mockUser.name).toBe('New Name');
    expect(mockUsersRepository.update).toHaveBeenCalledWith(mockUser);
    expect(result).toBe(updatedUser);
  });

  it('should handle repository errors when finding user', async () => {
    const command = new UpdateUserNameCommand('user-id' as UUID, 'New Name');
    const error = new Error('User not found');

    jest.spyOn(mockUsersRepository, 'findOneById').mockRejectedValue(error);

    await expect(useCase.execute(command)).rejects.toThrow();
    expect(mockUsersRepository.findOneById).toHaveBeenCalledWith('user-id');
    expect(mockUsersRepository.update).not.toHaveBeenCalled();
  });

  it('should handle repository errors when updating user', async () => {
    const command = new UpdateUserNameCommand('user-id' as UUID, 'New Name');
    const mockUser = new User({
      id: 'user-id' as UUID,
      email: 'test@example.com',
      emailVerified: false,
      passwordHash: 'hash',
      role: UserRole.USER,
      orgId: 'org-id' as UUID,
      name: 'Old Name',
      hasAcceptedMarketing: false,
    });
    const updateError = new Error('Update failed');

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(mockUser);
    jest.spyOn(mockUsersRepository, 'update').mockRejectedValue(updateError);

    await expect(useCase.execute(command)).rejects.toThrow();
    expect(mockUsersRepository.findOneById).toHaveBeenCalledWith('user-id');
    expect(mockUsersRepository.update).toHaveBeenCalledWith(mockUser);
  });
});
