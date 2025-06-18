import { Test, TestingModule } from '@nestjs/testing';
import { UpdateUserNameUseCase } from './update-user-name.use-case';
import { UpdateUserNameCommand } from './update-user-name.command';
import { UsersRepository } from '../../ports/users.repository';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';

describe('UpdateUserNameUseCase', () => {
  let useCase: UpdateUserNameUseCase;
  let mockUsersRepository: Partial<UsersRepository>;

  beforeEach(async () => {
    mockUsersRepository = {
      findOneById: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserNameUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
      ],
    }).compile();

    useCase = module.get<UpdateUserNameUseCase>(UpdateUserNameUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should update user name successfully', async () => {
    const command = new UpdateUserNameCommand('user-id' as any, 'New Name');
    const mockUser = new User({
      id: 'user-id' as any,
      email: 'test@example.com',
      passwordHash: 'hash',
      role: UserRole.USER,
      orgId: 'org-id' as any,
      name: 'Old Name',
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
    const command = new UpdateUserNameCommand('user-id' as any, 'New Name');
    const error = new Error('User not found');

    jest.spyOn(mockUsersRepository, 'findOneById').mockRejectedValue(error);

    await expect(useCase.execute(command)).rejects.toThrow('User not found');
    expect(mockUsersRepository.findOneById).toHaveBeenCalledWith('user-id');
    expect(mockUsersRepository.update).not.toHaveBeenCalled();
  });

  it('should handle repository errors when updating user', async () => {
    const command = new UpdateUserNameCommand('user-id' as any, 'New Name');
    const mockUser = new User({
      id: 'user-id' as any,
      email: 'test@example.com',
      passwordHash: 'hash',
      role: UserRole.USER,
      orgId: 'org-id' as any,
      name: 'Old Name',
    });
    const updateError = new Error('Update failed');

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(mockUser);
    jest.spyOn(mockUsersRepository, 'update').mockRejectedValue(updateError);

    await expect(useCase.execute(command)).rejects.toThrow('Update failed');
    expect(mockUsersRepository.findOneById).toHaveBeenCalledWith('user-id');
    expect(mockUsersRepository.update).toHaveBeenCalledWith(mockUser);
  });
});
