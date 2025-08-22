import { Test, TestingModule } from '@nestjs/testing';
import { UpdateUserRoleUseCase } from './update-user-role.use-case';
import { UpdateUserRoleCommand } from './update-user-role.command';
import { UsersRepository } from '../../ports/users.repository';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import { UUID } from 'crypto';

describe('UpdateUserRoleUseCase', () => {
  let useCase: UpdateUserRoleUseCase;
  let mockUsersRepository: Partial<UsersRepository>;

  beforeEach(async () => {
    mockUsersRepository = {
      findOneById: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserRoleUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
      ],
    }).compile();

    useCase = module.get<UpdateUserRoleUseCase>(UpdateUserRoleUseCase);
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
    });
    const updateError = new Error('Update failed');

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(mockUser);
    jest.spyOn(mockUsersRepository, 'update').mockRejectedValue(updateError);

    await expect(useCase.execute(command)).rejects.toThrow('Update failed');
    expect(mockUsersRepository.findOneById).toHaveBeenCalledWith('user-id');
    expect(mockUsersRepository.update).toHaveBeenCalledWith(mockUser);
  });
});
