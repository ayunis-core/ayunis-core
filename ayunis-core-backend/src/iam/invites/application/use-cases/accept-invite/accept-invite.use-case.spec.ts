jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AcceptInviteUseCase } from './accept-invite.use-case';
import { AcceptInviteCommand } from './accept-invite.command';
import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import {
  InviteJwtService,
  INVITE_TOKEN_TYPE,
} from 'src/iam/invites/application/services/invite-jwt.service';
import { CreateUserUseCase } from 'src/iam/users/application/use-cases/create-user/create-user.use-case';
import { IsValidPasswordUseCase } from 'src/iam/users/application/use-cases/is-valid-password/is-valid-password.use-case';
import { FindUserByEmailUseCase } from 'src/iam/users/application/use-cases/find-user-by-email/find-user-by-email.use-case';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { UUID } from 'crypto';
import { UserCreatedEventPublisher } from 'src/iam/users/application/services/user-created-event-publisher.service';
import { User } from 'src/iam/users/domain/user.entity';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';

describe('AcceptInviteUseCase', () => {
  let useCase: AcceptInviteUseCase;
  let mockInvitesRepository: Partial<InvitesRepository>;
  let mockInviteJwtService: Partial<InviteJwtService>;
  let mockCreateUserUseCase: Partial<CreateUserUseCase>;
  let mockIsValidPasswordUseCase: Partial<IsValidPasswordUseCase>;
  let mockFindUserByEmailUseCase: Partial<FindUserByEmailUseCase>;
  let mockPublishUserCreated: Partial<UserCreatedEventPublisher>;
  let mockAcquireAllocationLock: Partial<AcquireSeatAllocationLockUseCase>;

  const inviteId = 'invite-id' as UUID;
  const orgId = 'org-id' as UUID;
  const createdUser = new User({
    email: 'user@example.com',
    emailVerified: true,
    passwordHash: 'password-hash',
    orgId,
    role: UserRole.USER,
    name: 'Jane Doe',
    hasAcceptedMarketing: false,
  });

  beforeAll(async () => {
    mockInvitesRepository = {
      findOne: jest.fn(),
      accept: jest.fn(),
    };
    mockInviteJwtService = {
      verifyInviteToken: jest.fn(),
    };
    mockCreateUserUseCase = {
      prepare: jest.fn().mockResolvedValue(createdUser),
      createPreparedWithoutPublishing: jest.fn().mockResolvedValue(createdUser),
    };
    mockIsValidPasswordUseCase = { execute: jest.fn() };
    mockFindUserByEmailUseCase = { execute: jest.fn() };
    mockPublishUserCreated = { publish: jest.fn() };
    mockAcquireAllocationLock = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcceptInviteUseCase,
        { provide: InvitesRepository, useValue: mockInvitesRepository },
        { provide: InviteJwtService, useValue: mockInviteJwtService },
        { provide: CreateUserUseCase, useValue: mockCreateUserUseCase },
        {
          provide: IsValidPasswordUseCase,
          useValue: mockIsValidPasswordUseCase,
        },
        {
          provide: FindUserByEmailUseCase,
          useValue: mockFindUserByEmailUseCase,
        },
        {
          provide: UserCreatedEventPublisher,
          useValue: mockPublishUserCreated,
        },
        {
          provide: AcquireSeatAllocationLockUseCase,
          useValue: mockAcquireAllocationLock,
        },
      ],
    }).compile();

    useCase = module.get<AcceptInviteUseCase>(AcceptInviteUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(mockInvitesRepository, 'accept').mockResolvedValue(true);
  });

  const acceptInviteWithRole = async (role: UserRole, department?: string) => {
    const invite = new Invite({
      id: inviteId,
      email: `${role}@example.com`,
      orgId,
      role,
      expiresAt: new Date(Date.now() + 86_400_000),
    });

    jest
      .spyOn(mockInviteJwtService, 'verifyInviteToken')
      .mockReturnValue({ inviteId, type: INVITE_TOKEN_TYPE });
    jest.spyOn(mockInvitesRepository, 'findOne').mockResolvedValue(invite);
    jest.spyOn(mockFindUserByEmailUseCase, 'execute').mockResolvedValue(null);
    jest.spyOn(mockIsValidPasswordUseCase, 'execute').mockResolvedValue(true);

    await useCase.execute(
      new AcceptInviteCommand({
        inviteToken: 'valid-token',
        userName: 'Jane Doe',
        password: 'securePass123',
        hasAcceptedMarketing: false,
        department,
      }),
    );
  };

  it.each([UserRole.USER, UserRole.MANAGER, UserRole.ADMIN])(
    'creates a user with the invite role %s',
    async (role) => {
      await acceptInviteWithRole(role);

      expect(mockCreateUserUseCase.prepare).toHaveBeenCalledWith(
        expect.objectContaining({ role }),
      );
      expect(
        mockCreateUserUseCase.createPreparedWithoutPublishing,
      ).toHaveBeenCalledWith(createdUser);
      expect(mockPublishUserCreated.publish).toHaveBeenCalledWith(createdUser);
    },
  );

  it('passes department through to user creation', async () => {
    await acceptInviteWithRole(UserRole.USER, 'jugendamt');

    expect(mockCreateUserUseCase.prepare).toHaveBeenCalledWith(
      expect.objectContaining({ department: 'jugendamt' }),
    );
  });

  it('prepares the user before acquiring the organization lock', async () => {
    jest.spyOn(mockAcquireAllocationLock, 'execute').mockImplementation(() => {
      expect(mockCreateUserUseCase.prepare).toHaveBeenCalled();
      return Promise.resolve();
    });

    await acceptInviteWithRole(UserRole.USER);
  });

  it('does not create a user when another request already accepted the invite', async () => {
    jest.spyOn(mockInvitesRepository, 'accept').mockResolvedValue(false);

    await expect(acceptInviteWithRole(UserRole.USER)).rejects.toMatchObject({
      code: 'INVITE_ALREADY_ACCEPTED',
    });
    expect(
      mockCreateUserUseCase.createPreparedWithoutPublishing,
    ).not.toHaveBeenCalled();
    expect(mockPublishUserCreated.publish).not.toHaveBeenCalled();
  });

  it('rejects when an account appears while invite acceptance waits for the organization lock', async () => {
    jest.spyOn(mockAcquireAllocationLock, 'execute').mockImplementation(() => {
      jest
        .spyOn(mockFindUserByEmailUseCase, 'execute')
        .mockResolvedValue(createdUser);
      return Promise.resolve();
    });

    await expect(acceptInviteWithRole(UserRole.USER)).rejects.toMatchObject({
      code: 'USER_ALREADY_EXISTS',
    });
    expect(mockInvitesRepository.accept).not.toHaveBeenCalled();
    expect(
      mockCreateUserUseCase.createPreparedWithoutPublishing,
    ).not.toHaveBeenCalled();
  });

  it('does not accept an invitation that expires while waiting for the organization lock', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-14T10:00:00.000Z'));
    jest.spyOn(mockAcquireAllocationLock, 'execute').mockImplementation(() => {
      jest.setSystemTime(new Date('2026-08-16T10:00:00.000Z'));
      return Promise.resolve();
    });

    try {
      await expect(acceptInviteWithRole(UserRole.USER)).rejects.toMatchObject({
        code: 'INVITE_EXPIRED',
      });
      expect(mockInvitesRepository.accept).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});
