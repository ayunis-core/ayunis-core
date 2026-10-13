import { randomUUID } from 'crypto';
import { FindUsersByOrgIdUseCase } from './find-users-by-org-id.use-case';
import { FindUsersByOrgIdQuery } from './find-users-by-org-id.query';
import { User } from 'src/iam/users/domain/user.entity';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserResponseDtoMapper } from 'src/iam/users/presenters/http/mappers/user-response-dto.mapper';

describe('user-list team privacy', () => {
  const orgId = randomUUID();
  const teams = [{ id: randomUUID(), name: 'Bauamt' }];
  const user = new User({
    orgId,
    name: 'Anna Müller',
    email: 'anna@bamberg.example',
    passwordHash: null,
    emailVerified: true,
    role: UserRole.USER,
    hasAcceptedMarketing: false,
  });
  const userTeams = { execute: jest.fn() };
  beforeEach(() =>
    userTeams.execute
      .mockReset()
      .mockResolvedValue(new Map([[user.id, teams]])),
  );
  function useCase(role: UserRole, systemRole = SystemRole.CUSTOMER) {
    return new FindUsersByOrgIdUseCase(
      {
        findManyByOrgId: jest
          .fn()
          .mockResolvedValue(
            new Paginated({ data: [user], limit: 25, offset: 0, total: 1 }),
          ),
      } as never,
      {
        get: (key: string) =>
          ({ userId: randomUUID(), orgId, role, systemRole })[key as 'orgId'],
      } as never,
      { execute: jest.fn().mockResolvedValue(true) } as never,
      userTeams as never,
    );
  }
  function query() {
    return new FindUsersByOrgIdQuery({ orgId, includeTeams: true });
  }
  it('returns current team summaries for an administrator', async () => {
    const result = await useCase(UserRole.ADMIN).execute(query());
    expect(
      new UserResponseDtoMapper().toPaginatedDto(result, true).data[0],
    ).toHaveProperty('teams', teams);
  });
  it.each([UserRole.USER, UserRole.MANAGER])(
    'omits team data for %s even with user-list permission',
    async (role) => {
      const result = await useCase(role).execute(query());
      expect(
        new UserResponseDtoMapper().toPaginatedDto(result).data[0],
      ).not.toHaveProperty('teams');
      expect(userTeams.execute).not.toHaveBeenCalled();
    },
  );
  it('returns empty teams for a user without memberships', async () => {
    userTeams.execute.mockResolvedValue(new Map());
    const result = await useCase(UserRole.ADMIN).execute(query());
    expect(
      new UserResponseDtoMapper().toPaginatedDto(result, true).data[0],
    ).toHaveProperty('teams', []);
  });
  it('does not load teams for other callers of the user lookup', async () => {
    await useCase(UserRole.ADMIN).execute(new FindUsersByOrgIdQuery({ orgId }));
    expect(userTeams.execute).not.toHaveBeenCalled();
  });
});
