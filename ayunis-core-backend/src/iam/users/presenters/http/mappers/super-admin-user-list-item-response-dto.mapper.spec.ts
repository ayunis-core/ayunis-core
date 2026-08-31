import { Paginated } from 'src/common/pagination/paginated.entity';
import { SuperAdminUserListItem } from 'src/iam/users/domain/super-admin-user-list-item';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { UserResponseDtoMapper } from './user-response-dto.mapper';
import { SuperAdminUserListItemResponseDtoMapper } from './super-admin-user-list-item-response-dto.mapper';

describe('SuperAdminUserListItemResponseDtoMapper', () => {
  it('includes the organization name in paginated user responses', () => {
    const user = new User({
      id: '0e403d15-ad54-4ee5-9ca6-2b929436a74a',
      email: 'alex.meier@example.de',
      emailVerified: true,
      passwordHash: 'hashed-password',
      role: UserRole.USER,
      orgId: '36899a8a-bc67-4456-b824-19874f76b87b',
      name: 'Alex Meier',
      hasAcceptedMarketing: false,
      lockedAt: new Date('2026-08-24T10:00:00.000Z'),
      createdAt: new Date('2026-08-18T10:00:00.000Z'),
    });
    const mapper = new SuperAdminUserListItemResponseDtoMapper(
      new UserResponseDtoMapper(),
    );

    const result = mapper.toPaginatedDto(
      new Paginated({
        data: [new SuperAdminUserListItem({ user, orgName: 'Stadt Beispiel' })],
        limit: 25,
        offset: 0,
        total: 1,
      }),
    );

    expect(result.data).toEqual([
      expect.objectContaining({
        id: user.id,
        name: 'Alex Meier',
        email: 'alex.meier@example.de',
        orgId: user.orgId,
        orgName: 'Stadt Beispiel',
        isLocked: true,
      }),
    ]);
    expect(result.pagination).toEqual({ limit: 25, offset: 0, total: 1 });
  });
});
