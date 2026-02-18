import { Test, TestingModule } from '@nestjs/testing';

// Mock the Transactional decorator
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (target: any, propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { DeleteUserUseCase } from './delete-user.use-case';
import { DeleteUserCommand } from './delete-user.command';
import { UsersRepository } from '../../ports/users.repository';
import { UUID } from 'crypto';
import { SendWebhookUseCase } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.use-case';
import { DeleteInviteByEmailUseCase } from 'src/iam/invites/application/use-cases/delete-invite-by-email/delete-invite-by-email.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let mockUsersRepository: Partial<UsersRepository>;
  let mockSendWebhookUseCase: Partial<SendWebhookUseCase>;
  let mockDeleteInviteByEmailUseCase: Partial<DeleteInviteByEmailUseCase>;
  let mockContextService: Partial<ContextService>;

  beforeEach(async () => {
    mockUsersRepository = {
      delete: jest.fn(),
      findOneById: jest.fn(),
    };
    mockSendWebhookUseCase = {
      execute: jest.fn(),
    };
    mockDeleteInviteByEmailUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    mockContextService = {
      get: jest.fn((key?: string) => {
        if (!key) return undefined;
        const context: Record<string, any> = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          orgId: '123e4567-e89b-12d3-a456-426614174000',
          role: UserRole.ADMIN,
          systemRole: null,
        };
        return context[key];
      }) as any,
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteUserUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: SendWebhookUseCase, useValue: mockSendWebhookUseCase },
        {
          provide: DeleteInviteByEmailUseCase,
          useValue: mockDeleteInviteByEmailUseCase,
        },
        { provide: ContextService, useValue: mockContextService },
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

    const mockUser = new User({
      id: command.userId,
      email: 'user@example.com',
      emailVerified: true,
      passwordHash: 'hash',
      role: UserRole.ADMIN,
      orgId: '123e4567-e89b-12d3-a456-426614174000' as UUID,
      name: 'Test User',
      hasAcceptedMarketing: false,
    });

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(mockUser);
    jest.spyOn(mockUsersRepository, 'delete').mockResolvedValue(undefined);

    await useCase.execute(command);

    expect(mockUsersRepository.findOneById).toHaveBeenCalledWith(
      command.userId,
    );
    expect(mockUsersRepository.delete).toHaveBeenCalledWith(command.userId);
  });

  it('should handle repository errors', async () => {
    const command = new DeleteUserCommand({
      userId: 'user-id' as UUID,
      orgId: '123e4567-e89b-12d3-a456-426614174000' as UUID,
    });

    const mockUser = new User({
      id: command.userId,
      email: 'user@example.com',
      emailVerified: true,
      passwordHash: 'hash',
      role: UserRole.ADMIN,
      orgId: '123e4567-e89b-12d3-a456-426614174000' as UUID,
      name: 'Test User',
      hasAcceptedMarketing: false,
    });

    const error = new Error('Repository error');

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(mockUser);
    jest.spyOn(mockUsersRepository, 'delete').mockRejectedValue(error);

    await expect(useCase.execute(command)).rejects.toThrow('Repository error');
    expect(mockUsersRepository.findOneById).toHaveBeenCalledWith(
      command.userId,
    );
    expect(mockUsersRepository.delete).toHaveBeenCalledWith(command.userId);
  });
});
