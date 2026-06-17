import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { FindSuperAdminsUseCase } from './find-super-admins.use-case';
import { UsersRepository } from '../../ports/users.repository';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import { SystemRole } from '../../../domain/value-objects/system-role.enum';
import type { UUID } from 'crypto';
import { UserUnexpectedError } from '../../users.errors';

describe('FindSuperAdminsUseCase', () => {
  let useCase: FindSuperAdminsUseCase;
  let mockUsersRepository: Partial<UsersRepository>;

  beforeAll(async () => {
    mockUsersRepository = {
      findManyBySystemRole: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindSuperAdminsUseCase,
        { provide: UsersRepository, useValue: mockUsersRepository },
      ],
    }).compile();

    useCase = module.get<FindSuperAdminsUseCase>(FindSuperAdminsUseCase);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all super admin users', async () => {
    const superAdmin1 = new User({
      id: 'admin-1-id' as UUID,
      email: 'admin1@example.com',
      emailVerified: true,
      passwordHash: 'hash',
      role: UserRole.USER,
      systemRole: SystemRole.SUPER_ADMIN,
      orgId: 'org-1-id' as UUID,
      name: 'Admin One',
      hasAcceptedMarketing: false,
    });
    const superAdmin2 = new User({
      id: 'admin-2-id' as UUID,
      email: 'admin2@example.com',
      emailVerified: true,
      passwordHash: 'hash',
      role: UserRole.ADMIN,
      systemRole: SystemRole.SUPER_ADMIN,
      orgId: 'org-2-id' as UUID,
      name: 'Admin Two',
      hasAcceptedMarketing: true,
    });

    jest
      .spyOn(mockUsersRepository, 'findManyBySystemRole')
      .mockResolvedValue([superAdmin1, superAdmin2]);

    const result = await useCase.execute();

    expect(mockUsersRepository.findManyBySystemRole).toHaveBeenCalledWith(
      SystemRole.SUPER_ADMIN,
    );
    expect(result).toEqual([superAdmin1, superAdmin2]);
  });

  it('should return an empty array when no super admins exist', async () => {
    jest
      .spyOn(mockUsersRepository, 'findManyBySystemRole')
      .mockResolvedValue([]);

    const result = await useCase.execute();

    expect(mockUsersRepository.findManyBySystemRole).toHaveBeenCalledWith(
      SystemRole.SUPER_ADMIN,
    );
    expect(result).toEqual([]);
  });

  it('should throw UserUnexpectedError when repository throws', async () => {
    jest
      .spyOn(mockUsersRepository, 'findManyBySystemRole')
      .mockRejectedValue(new Error('Database connection failed'));

    await expect(useCase.execute()).rejects.toThrow(UserUnexpectedError);
  });
});
