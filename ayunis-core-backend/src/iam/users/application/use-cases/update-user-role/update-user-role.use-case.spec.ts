import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UpdateUserRoleUseCase } from './update-user-role.use-case';
import { UpdateUserRoleCommand } from './update-user-role.command';
import { UserUpdatedEvent } from '../../events/user-updated.event';
import { UsersRepository } from '../../ports/users.repository';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { UUID } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserUnauthorizedError, UserUnexpectedError } from '../../users.errors';
import { ContextService } from 'src/common/context/services/context.service';

describe('UpdateUserRoleUseCase', () => {
  let useCase: UpdateUserRoleUseCase;
  let mockUsersRepository: Partial<UsersRepository>;
  let mockEventEmitter: { emitAsync: jest.Mock };
  let requesterOrgId: UUID | undefined;
  let mockContextService: Partial<ContextService>;

  beforeAll(async () => {
    mockUsersRepository = {
      findOneById: jest.fn(),
      update: jest.fn(),
    };
    mockEventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    };
    mockContextService = {
      get: jest.fn((key?: string) =>
        key === 'orgId' ? requesterOrgId : undefined,
      ) as unknown as ContextService['get'],
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserRoleUseCase,
        { provide: ContextService, useValue: mockContextService },
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    useCase = module.get<UpdateUserRoleUseCase>(UpdateUserRoleUseCase);
  });
  beforeEach(() => {
    jest.clearAllMocks();
    requesterOrgId = 'org-id' as UUID;
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
    jest.spyOn(mockUsersRepository, 'update').mockResolvedValue(updatedUser);

    const result = await useCase.execute(command);

    expect(mockUsersRepository.findOneById).toHaveBeenCalledWith('user-id');
    expect(mockUser.role).toBe(UserRole.ADMIN);
    expect(mockUsersRepository.update).toHaveBeenCalledWith(mockUser);
    expect(result).toBe(updatedUser);
  });

  it('should emit UserUpdatedEvent after successful update', async () => {
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

  it('should reject updating a user from a different organization', async () => {
    requesterOrgId = 'requester-org-id' as UUID;
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
      orgId: 'other-org-id' as UUID,
      name: 'Test User',
      hasAcceptedMarketing: false,
    });

    jest.spyOn(mockUsersRepository, 'findOneById').mockResolvedValue(mockUser);

    await expect(useCase.execute(command)).rejects.toThrow(
      UserUnauthorizedError,
    );
    expect(mockUsersRepository.findOneById).toHaveBeenCalledWith('user-id');
    expect(mockUsersRepository.update).not.toHaveBeenCalled();
    expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('should reject when the requester is not authenticated', async () => {
    requesterOrgId = undefined;
    const command = new UpdateUserRoleCommand(
      'user-id' as UUID,
      UserRole.ADMIN,
    );

    await expect(useCase.execute(command)).rejects.toThrow(
      UserUnauthorizedError,
    );
    expect(mockUsersRepository.findOneById).not.toHaveBeenCalled();
    expect(mockUsersRepository.update).not.toHaveBeenCalled();
    expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('should handle repository errors when finding user', async () => {
    const command = new UpdateUserRoleCommand(
      'user-id' as UUID,
      UserRole.ADMIN,
    );
    const error = new Error('User not found');

    jest.spyOn(mockUsersRepository, 'findOneById').mockRejectedValue(error);

    await expect(useCase.execute(command)).rejects.toThrow();
    expect(mockUsersRepository.findOneById).toHaveBeenCalledWith('user-id');
    expect(mockUsersRepository.update).not.toHaveBeenCalled();
    expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
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
    expect(mockUsersRepository.findOneById).toHaveBeenCalledWith('user-id');
    expect(mockUsersRepository.update).toHaveBeenCalledWith(mockUser);
    expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
  });
});
