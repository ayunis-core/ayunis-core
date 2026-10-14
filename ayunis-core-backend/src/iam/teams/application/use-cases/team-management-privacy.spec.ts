import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { AssertTeamManagementAllowedUseCase } from 'src/iam/teams/application/use-cases/assert-team-management-allowed/assert-team-management-allowed.use-case';

const orgId = randomUUID();
const userId = randomUUID();
describe('team management privacy', () => {
  async function policy(
    hidden: boolean,
    superAdmin = false,
    inviterRole = SystemRole.SUPER_ADMIN,
  ) {
    const context = {
      userId,
      orgId,
      role: UserRole.ADMIN,
      systemRole: superAdmin ? SystemRole.SUPER_ADMIN : SystemRole.CUSTOMER,
    };
    const module = await Test.createTestingModule({
      providers: [
        AssertTeamManagementAllowedUseCase,
        {
          provide: ContextService,
          useValue: { get: (key: keyof typeof context) => context[key] },
        },
        {
          provide: FindOrgByIdUseCase,
          useValue: { execute: async () => ({ hideIndividualUsage: hidden }) },
        },
        {
          provide: FindUserByIdUseCase,
          useValue: { execute: async () => ({ systemRole: inviterRole }) },
        },
      ],
    }).compile();
    return module.get(AssertTeamManagementAllowedUseCase);
  }
  it('rejects an organisation admin while individual usage is hidden', async () => {
    await expect((await policy(true)).execute({ orgId })).rejects.toMatchObject(
      { statusCode: 403 },
    );
  });
  it('allows normal management with privacy disabled', async () => {
    await expect(
      (await policy(false)).execute({ orgId }),
    ).resolves.toBeUndefined();
  });
  it('honours team grants authorized by a super-admin inviter', async () => {
    await expect(
      (await policy(true)).execute({ orgId, inviterId: userId }),
    ).resolves.toBeUndefined();
  });
  it('rejects team grants from an organisation-admin inviter after privacy is enabled', async () => {
    await expect(
      (await policy(true, false, SystemRole.CUSTOMER)).execute({
        orgId,
        inviterId: userId,
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
  it('allows a human super admin while privacy is enabled', async () => {
    await expect(
      (await policy(true, true)).execute({ orgId }),
    ).resolves.toBeUndefined();
  });
});
