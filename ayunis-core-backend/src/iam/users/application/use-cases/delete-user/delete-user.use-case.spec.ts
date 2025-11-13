import { Test, TestingModule } from '@nestjs/testing';
import { DeleteUserUseCase } from './delete-user.use-case';
import { DeleteUserCommand } from './delete-user.command';
import { UsersRepository } from '../../ports/users.repository';
import { UUID } from 'crypto';
import { SendWebhookUseCase } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.use-case';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let mockUsersRepository: Partial<UsersRepository>;
  let mockSendWebhookUseCase: Partial<SendWebhookUseCase>;

  beforeEach(async () => {
    mockUsersRepository = {
      delete: jest.fn(),
      findOneById: jest.fn(),
    };
    mockSendWebhookUseCase = {
      execute: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteUserUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: SendWebhookUseCase, useValue: mockSendWebhookUseCase },
      ],
    }).compile();

    useCase = module.get<DeleteUserUseCase>(DeleteUserUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should delete user successfully', async () => {
    const command = new DeleteUserCommand({
      userId: '123e4567-e89b-12d3-a456-426614174000' as UUID,
      orgId: '123e4567-e89b-12d3-a456-426614174000' as UUID,
    });

    jest.spyOn(mockUsersRepository, 'delete').mockResolvedValue(undefined);

    await useCase.execute(command);

    expect(mockUsersRepository.delete).toHaveBeenCalledWith(command.userId);
  });

  it('should handle repository errors', async () => {
    const command = new DeleteUserCommand({
      userId: 'user-id' as UUID,
      orgId: 'org-id' as UUID,
    });
    const error = new Error('Repository error');

    jest.spyOn(mockUsersRepository, 'delete').mockRejectedValue(error);

    await expect(useCase.execute(command)).rejects.toThrow('Repository error');
    expect(mockUsersRepository.delete).toHaveBeenCalledWith(command.userId);
  });
});
