import { Test, TestingModule } from '@nestjs/testing';
import { DeleteUserUseCase } from './delete-user.use-case';
import { DeleteUserCommand } from './delete-user.command';
import { UsersRepository } from '../../ports/users.repository';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let mockUsersRepository: Partial<UsersRepository>;

  beforeEach(async () => {
    mockUsersRepository = {
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteUserUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
      ],
    }).compile();

    useCase = module.get<DeleteUserUseCase>(DeleteUserUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should delete user successfully', async () => {
    const command = new DeleteUserCommand('user-id' as any);

    jest.spyOn(mockUsersRepository, 'delete').mockResolvedValue(undefined);

    await useCase.execute(command);

    expect(mockUsersRepository.delete).toHaveBeenCalledWith('user-id');
  });

  it('should handle repository errors', async () => {
    const command = new DeleteUserCommand('user-id' as any);
    const error = new Error('Repository error');

    jest.spyOn(mockUsersRepository, 'delete').mockRejectedValue(error);

    await expect(useCase.execute(command)).rejects.toThrow('Repository error');
    expect(mockUsersRepository.delete).toHaveBeenCalledWith('user-id');
  });
});
