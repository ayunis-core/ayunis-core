import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AcceptInviteUseCase } from './accept-invite.use-case';
import { AcceptInviteCommand } from './accept-invite.command';
import { InvitesRepository } from '../../ports/invites.repository';
import { InviteJwtService } from '../../services/invite-jwt.service';
import { CreateRegularUserUseCase } from 'src/iam/users/application/use-cases/create-regular-user/create-regular-user.use-case';
import { CreateAdminUserUseCase } from 'src/iam/users/application/use-cases/create-admin-user/create-admin-user.use-case';
import { IsValidPasswordUseCase } from 'src/iam/users/application/use-cases/is-valid-password/is-valid-password.use-case';
import { FindUserByEmailUseCase } from 'src/iam/users/application/use-cases/find-user-by-email/find-user-by-email.use-case';
import { Invite } from '../../../domain/invite.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { UUID } from 'crypto';

describe('AcceptInviteUseCase', () => {
  let useCase: AcceptInviteUseCase;
  let mockInvitesRepository: Partial<InvitesRepository>;
  let mockInviteJwtService: Partial<InviteJwtService>;
  let mockCreateRegularUserUseCase: Partial<CreateRegularUserUseCase>;
  let mockCreateAdminUserUseCase: Partial<CreateAdminUserUseCase>;
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
    mockCreateRegularUserUseCase = { execute: jest.fn() };
    mockCreateAdminUserUseCase = { execute: jest.fn() };
    mockIsValidPasswordUseCase = { execute: jest.fn() };
    mockFindUserByEmailUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcceptInviteUseCase,
        { provide: InvitesRepository, useValue: mockInvitesRepository },
        { provide: InviteJwtService, useValue: mockInviteJwtService },
        {
          provide: CreateRegularUserUseCase,
          useValue: mockCreateRegularUserUseCase,
        },
        {
          provide: CreateAdminUserUseCase,
          useValue: mockCreateAdminUserUseCase,
        },
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

  it('should pass department to create-regular-user command', async () => {
    const invite = new Invite({
      id: inviteId,
      email: 'user@example.com',
      orgId,
      role: UserRole.USER,
      expiresAt: new Date(Date.now() + 86_400_000),
    });

    jest
      .spyOn(mockInviteJwtService, 'verifyInviteToken')
      .mockReturnValue({ inviteId });
    jest.spyOn(mockInvitesRepository, 'findOne').mockResolvedValue(invite);
    jest
      .spyOn(mockFindUserByEmailUseCase, 'execute')
      .mockResolvedValue(null as never);
    jest.spyOn(mockIsValidPasswordUseCase, 'execute').mockResolvedValue(true);

    const command = new AcceptInviteCommand({
      inviteToken: 'valid-token',
      userName: 'Jane Doe',
      password: 'securePass123',
      hasAcceptedMarketing: false,
      department: 'jugendamt',
    });

    await useCase.execute(command);

    expect(mockCreateRegularUserUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ department: 'jugendamt' }),
    );
  });

  it('should pass department to create-admin-user command', async () => {
    const invite = new Invite({
      id: inviteId,
      email: 'admin@example.com',
      orgId,
      role: UserRole.ADMIN,
      expiresAt: new Date(Date.now() + 86_400_000),
    });

    jest
      .spyOn(mockInviteJwtService, 'verifyInviteToken')
      .mockReturnValue({ inviteId });
    jest.spyOn(mockInvitesRepository, 'findOne').mockResolvedValue(invite);
    jest
      .spyOn(mockFindUserByEmailUseCase, 'execute')
      .mockResolvedValue(null as never);
    jest.spyOn(mockIsValidPasswordUseCase, 'execute').mockResolvedValue(true);

    const command = new AcceptInviteCommand({
      inviteToken: 'valid-token',
      userName: 'Admin User',
      password: 'securePass123',
      hasAcceptedMarketing: true,
      department: 'other:Wasserwerk',
    });

    await useCase.execute(command);

    expect(mockCreateAdminUserUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ department: 'other:Wasserwerk' }),
    );
  });
});
