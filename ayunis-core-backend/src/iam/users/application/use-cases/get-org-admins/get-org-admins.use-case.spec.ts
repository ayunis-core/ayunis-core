import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetOrgAdminsUseCase } from './get-org-admins.use-case';
import { GetOrgAdminsQuery } from './get-org-admins.query';
import { UsersRepository } from '../../ports/users.repository';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import { SystemRole } from '../../../domain/value-objects/system-role.enum';
import type { UUID } from 'crypto';
import { UserUnexpectedError } from '../../users.errors';

describe('GetOrgAdminsUseCase', () => {
  let useCase: GetOrgAdminsUseCase;
  let mockUsersRepository: Partial<UsersRepository>;

  const orgId = 'org-42' as UUID;

  beforeAll(async () => {
    mockUsersRepository = {
      findAdminsByOrgId: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetOrgAdminsUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
      ],
    }).compile();

    useCase = module.get<GetOrgAdminsUseCase>(GetOrgAdminsUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the org admins for the requested org', async () => {
    const admin = new User({
      id: 'admin-1' as UUID,
      email: 'admin@stadt-musterhausen.de',
      emailVerified: true,
      passwordHash: 'hash',
      role: UserRole.ADMIN,
      systemRole: SystemRole.CUSTOMER,
      orgId,
      name: 'Andrea Admin',
      hasAcceptedMarketing: false,
    });

    jest
      .spyOn(mockUsersRepository, 'findAdminsByOrgId')
      .mockResolvedValue([admin]);

    const result = await useCase.execute(new GetOrgAdminsQuery(orgId));

    expect(mockUsersRepository.findAdminsByOrgId).toHaveBeenCalledWith(orgId);
    expect(result).toEqual([admin]);
  });

  it('should return an empty array when the org has no admins', async () => {
    jest.spyOn(mockUsersRepository, 'findAdminsByOrgId').mockResolvedValue([]);

    const result = await useCase.execute(new GetOrgAdminsQuery(orgId));

    expect(result).toEqual([]);
  });

  it('should throw UserUnexpectedError when the repository throws', async () => {
    jest
      .spyOn(mockUsersRepository, 'findAdminsByOrgId')
      .mockRejectedValue(new Error('Database connection failed'));

    await expect(useCase.execute(new GetOrgAdminsQuery(orgId))).rejects.toThrow(
      UserUnexpectedError,
    );
  });
});
