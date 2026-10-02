import type { UUID } from 'crypto';
import { SYSTEM_ROLES_KEY } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { ResolveSubscriptionOverlapCommand } from 'src/iam/subscriptions/application/use-cases/resolve-subscription-overlap/resolve-subscription-overlap.command';
import { SuperAdminSubscriptionOverlapController } from 'src/iam/subscriptions/presenters/http/super-admin-subscription-overlap.controller';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

const ORG_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const USER_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const AUTHORITATIVE_ID = '33333333-3333-3333-3333-333333333333' as UUID;
const ADJUSTED_ID = '44444444-4444-4444-4444-444444444444' as UUID;

describe(SuperAdminSubscriptionOverlapController.name, () => {
  const useCase = { execute: jest.fn() };
  const controller = new SuperAdminSubscriptionOverlapController(
    useCase as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('is restricted to super admins', () => {
    expect(
      Reflect.getMetadata(
        SYSTEM_ROLES_KEY,
        SuperAdminSubscriptionOverlapController,
      ),
    ).toEqual([SystemRole.SUPER_ADMIN]);
  });

  it('maps the validated request to the correction command', async () => {
    const accessEndsAt = '2026-08-01T00:00:00.000Z';

    await controller.resolveSubscriptionOverlap(ORG_ID, USER_ID, {
      authoritativeSubscriptionId: AUTHORITATIVE_ID,
      adjustments: [{ subscriptionId: ADJUSTED_ID, accessEndsAt }],
      reason: 'Contract transition correction',
    });

    expect(useCase.execute).toHaveBeenCalledWith(
      new ResolveSubscriptionOverlapCommand({
        orgId: ORG_ID,
        requestingUserId: USER_ID,
        authoritativeSubscriptionId: AUTHORITATIVE_ID,
        adjustments: [
          { subscriptionId: ADJUSTED_ID, accessEndsAt: new Date(accessEndsAt) },
        ],
        reason: 'Contract transition correction',
      }),
    );
  });
});
