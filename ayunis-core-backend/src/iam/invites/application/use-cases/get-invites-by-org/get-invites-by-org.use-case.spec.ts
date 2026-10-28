import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import {
  aUserContext,
  createMockContextService,
  getFromStore,
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/common/context/testing/context.fixtures';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { UnauthorizedInviteAccessError } from 'src/iam/invites/application/invites.errors';
import type { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import { GetInvitesByOrgQuery } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.query';
import { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

const OTHER_ORG_ID = '33333333-3333-4333-8333-333333333333' as UUID;
const API_KEY_ID = '44444444-4444-4444-8444-444444444444' as UUID;

describe('GetInvitesByOrgUseCase', () => {
  const invitesRepository = {
    findByOrgIdPaginated: jest.fn(),
  };
  const emptyPage = new Paginated({
    data: [],
    limit: 25,
    offset: 0,
    total: 0,
  });

  beforeEach(() => {
    invitesRepository.findByOrgIdPaginated.mockReset();
    invitesRepository.findByOrgIdPaginated.mockResolvedValue(emptyPage);
  });

  function useCase(
    store: Parameters<typeof createMockContextService>[0],
  ): GetInvitesByOrgUseCase {
    return new GetInvitesByOrgUseCase(
      invitesRepository as unknown as InvitesRepository,
      createMockContextService(store),
    );
  }

  function query(orgId: UUID = TEST_ORG_ID): GetInvitesByOrgQuery {
    return new GetInvitesByOrgQuery({
      orgId,
      requestingUserId: TEST_USER_ID,
    });
  }

  it('allows a super admin to list another organisation', async () => {
    const result = await useCase(
      aUserContext({
        role: UserRole.USER,
        systemRole: SystemRole.SUPER_ADMIN,
      }),
    ).execute(query(OTHER_ORG_ID));

    expect(result).toBe(emptyPage);
    expect(invitesRepository.findByOrgIdPaginated).toHaveBeenCalledWith(
      OTHER_ORG_ID,
      { limit: 25, offset: 0 },
      { search: undefined, onlyPending: false },
    );
  });

  it('allows an organisation admin for their own organisation', async () => {
    await useCase(
      aUserContext({
        role: UserRole.ADMIN,
        systemRole: SystemRole.CUSTOMER,
      }),
    ).execute(query());

    expect(invitesRepository.findByOrgIdPaginated).toHaveBeenCalled();
  });

  it('rejects an organisation admin for another organisation', async () => {
    await expect(
      useCase(
        aUserContext({
          role: UserRole.ADMIN,
          systemRole: SystemRole.CUSTOMER,
        }),
      ).execute(query(OTHER_ORG_ID)),
    ).rejects.toThrow(UnauthorizedInviteAccessError);
    expect(invitesRepository.findByOrgIdPaginated).not.toHaveBeenCalled();
  });

  it('rejects an ordinary member', async () => {
    await expect(
      useCase(
        aUserContext({
          role: UserRole.USER,
          systemRole: SystemRole.CUSTOMER,
        }),
      ).execute(query()),
    ).rejects.toThrow(UnauthorizedInviteAccessError);
  });

  it('rejects an api key even when systemRole is super admin', async () => {
    const context = createMockContextService();
    context.get.mockImplementation(
      getFromStore({
        orgId: TEST_ORG_ID,
        apiKeyId: API_KEY_ID,
        systemRole: SystemRole.SUPER_ADMIN,
      }) as ContextService['get'],
    );
    const apiKeyCaller = new GetInvitesByOrgUseCase(
      invitesRepository as unknown as InvitesRepository,
      context,
    );

    await expect(apiKeyCaller.execute(query())).rejects.toThrow(
      UnauthorizedInviteAccessError,
    );
    expect(invitesRepository.findByOrgIdPaginated).not.toHaveBeenCalled();
  });
});
