import { Test, TestingModule } from '@nestjs/testing';
import { DeleteUserUseCase } from './delete-user.use-case';
import { DeleteUserCommand } from './delete-user.command';
import { UsersRepository } from '../../ports/users.repository';
import { UUID } from 'crypto';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let mockUsersRepository: Partial<UsersRepository>;

  beforeEach(async () => {
    mockUsersRepository = {
      delete: jest.fn(),
      findOneById: jest.fn(),
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
    const command = new DeleteUserCommand({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      orgId: '123e4567-e89b-12d3-a456-426614174000',
      requestUserId: '123e4567-e89b-12d3-a456-426614174000',
    });

    jest
      .spyOn(mockUsersRepository, 'findOneById')
      .mockResolvedValue({
        id: command.requestUserId,
        role: 'admin',
        orgId: command.orgId,
      } as any);
    jest.spyOn(mockUsersRepository, 'delete').mockResolvedValue(undefined);

    await useCase.execute(command);

    expect(mockUsersRepository.delete).toHaveBeenCalledWith(command.userId);
  });

  it('should handle repository errors', async () => {
    const command = new DeleteUserCommand({
      userId: 'user-id' as UUID,
      orgId: 'org-id' as UUID,
      requestUserId: 'request-user-id' as UUID,
    });
    const error = new Error('Repository error');

    jest
      .spyOn(mockUsersRepository, 'findOneById')
      .mockResolvedValue({
        id: command.requestUserId,
        role: 'admin',
        orgId: command.orgId,
      } as any);
    jest.spyOn(mockUsersRepository, 'delete').mockRejectedValue(error);

    await expect(useCase.execute(command)).rejects.toThrow('Repository error');
    expect(mockUsersRepository.delete).toHaveBeenCalledWith(command.userId);
  });
});
