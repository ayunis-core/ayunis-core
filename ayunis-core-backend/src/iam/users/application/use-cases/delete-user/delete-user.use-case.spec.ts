import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Mock the Transactional decorator
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { DeleteUserUseCase } from './delete-user.use-case';
import { DeleteUserCommand } from './delete-user.command';
import { UserDeletedEvent } from '../../events/user-deleted.event';
import { UsersRepository } from '../../ports/users.repository';
import type { UUID } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeleteInviteByEmailUseCase } from 'src/iam/invites/application/use-cases/delete-invite-by-email/delete-invite-by-email.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let mockUsersRepository: Partial<UsersRepository>;
  let mockEventEmitter: { emitAsync: jest.Mock };
  let mockDeleteInviteByEmailUseCase: Partial<DeleteInviteByEmailUseCase>;
  let mockContextService: Partial<ContextService>;

  beforeEach(async () => {
    mockUsersRepository = {
      delete: jest.fn(),
      findOneById: jest.fn(),
    };
    mockEventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    };
    mockDeleteInviteByEmailUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    mockContextService = {
      get: jest.fn((key?: string) => {
        if (!key) return undefined;
        const context: Record<string, unknown> = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          orgId: '123e4567-e89b-12d3-a456-426614174000',
          role: UserRole.ADMIN,
          systemRole: null,
        };
        return context[key];
      }) as ContextService['get'],
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteUserUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
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

  it('should emit UserDeletedEvent after successful deletion', async () => {
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

    expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
      UserDeletedEvent.EVENT_NAME,
      expect.objectContaining({
        userId: command.userId,
        orgId: mockUser.orgId,
      }),
    );
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
