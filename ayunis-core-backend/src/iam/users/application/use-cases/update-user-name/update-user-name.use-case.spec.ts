import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UpdateUserNameUseCase } from './update-user-name.use-case';
import { UpdateUserNameCommand } from './update-user-name.command';
import { UserUpdatedEvent } from '../../events/user-updated.event';
import { UsersRepository } from '../../ports/users.repository';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import type { UUID } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('UpdateUserNameUseCase', () => {
  let useCase: UpdateUserNameUseCase;
  let mockUsersRepository: Partial<UsersRepository>;
  let mockEventEmitter: { emitAsync: jest.Mock };

  beforeAll(async () => {
    mockUsersRepository = {
      findOneById: jest.fn(),
      update: jest.fn(),
    };
    mockEventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserNameUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    useCase = module.get<UpdateUserNameUseCase>(UpdateUserNameUseCase);
  });
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('should emit UserUpdatedEvent after successful update', async () => {
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

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(mockUser);
    jest.spyOn(mockUsersRepository, 'update').mockResolvedValue(mockUser);

    await useCase.execute(command);

    expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
      UserUpdatedEvent.EVENT_NAME,
      expect.objectContaining({
        userId: mockUser.id,
        orgId: mockUser.orgId,
        user: mockUser,
      }),
    );
  });

  it('should handle repository errors when finding user', async () => {
    const command = new UpdateUserNameCommand('user-id' as UUID, 'New Name');
    const error = new Error('User not found');

    jest.spyOn(mockUsersRepository, 'findOneById').mockRejectedValue(error);

    await expect(useCase.execute(command)).rejects.toThrow();
    expect(mockUsersRepository.findOneById).toHaveBeenCalledWith('user-id');
    expect(mockUsersRepository.update).not.toHaveBeenCalled();
    expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
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
    expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
  });
});
