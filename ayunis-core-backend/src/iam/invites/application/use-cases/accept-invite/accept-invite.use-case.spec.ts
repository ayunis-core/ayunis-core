import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { AcceptInviteUseCase } from './accept-invite.use-case';
import { AcceptInviteCommand } from './accept-invite.command';
import { InvitesRepository } from '../../ports/invites.repository';
import {
  InviteJwtService,
  INVITE_TOKEN_TYPE,
} from '../../services/invite-jwt.service';
import { CreateUserUseCase } from 'src/iam/users/application/use-cases/create-user/create-user.use-case';
import { IsValidPasswordUseCase } from 'src/iam/users/application/use-cases/is-valid-password/is-valid-password.use-case';
import { FindUserByEmailUseCase } from 'src/iam/users/application/use-cases/find-user-by-email/find-user-by-email.use-case';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { UUID } from 'crypto';

describe('AcceptInviteUseCase', () => {
  let useCase: AcceptInviteUseCase;
  let mockInvitesRepository: Partial<InvitesRepository>;
  let mockInviteJwtService: Partial<InviteJwtService>;
  let mockCreateUserUseCase: Partial<CreateUserUseCase>;
  let mockIsValidPasswordUseCase: Partial<IsValidPasswordUseCase>;
  let mockFindUserByEmailUseCase: Partial<FindUserByEmailUseCase>;

  const inviteId = 'invite-id' as UUID;
  const orgId = 'org-id' as UUID;

  beforeAll(async () => {
    mockInvitesRepository = {
      findOne: jest.fn(),
      accept: jest.fn(),
    };
    mockInviteJwtService = {
      verifyInviteToken: jest.fn(),
    };
    mockCreateUserUseCase = { execute: jest.fn() };
    mockIsValidPasswordUseCase = { execute: jest.fn() };
    mockFindUserByEmailUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcceptInviteUseCase,
        {
          provide: getLoggerToken(AcceptInviteUseCase.name),
          useValue: createPinoLoggerMock(),
        },
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
      ],
    }).compile();

    useCase = module.get<AcceptInviteUseCase>(AcceptInviteUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
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

      expect(mockCreateUserUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ role }),
      );
    },
  );

  it('passes department through to user creation', async () => {
    await acceptInviteWithRole(UserRole.USER, 'jugendamt');

    expect(mockCreateUserUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ department: 'jugendamt' }),
    );
  });
});
