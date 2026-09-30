import { SYSTEM_ROLES_KEY } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SuperAdminSubscriptionsController } from 'src/iam/subscriptions/presenters/http/super-admin-subscriptions.controller';
import type { SubscriptionResponseMapper } from 'src/iam/subscriptions/presenters/http/mappers/subscription-response.mapper';
import { ListOrgSubscriptionsQuery } from 'src/iam/subscriptions/application/use-cases/list-org-subscriptions/list-org-subscriptions.query';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { SubscriptionLifecycleStatus } from 'src/iam/subscriptions/domain/value-objects/subscription-lifecycle-status.enum';
import type { UUID } from 'crypto';

const ORG_ID = '11111111-1111-1111-1111-111111111111' as UUID;

function createController() {
  const listOrgSubscriptions = { execute: jest.fn() };
  const mapper = {
    toHistoryResponse: jest.fn(),
  };
  const unused = { execute: jest.fn() };

  const controller = new SuperAdminSubscriptionsController(
    unused as never,
    listOrgSubscriptions as never,
    unused as never,
    unused as never,
    unused as never,
    unused as never,
    mapper as unknown as SubscriptionResponseMapper,
    unused as never,
    unused as never,
    unused as never,
    unused as never,
  );

  return { controller, listOrgSubscriptions, mapper };
}

describe(SuperAdminSubscriptionsController.name, () => {
  it('is restricted to super admins', () => {
    expect(
      Reflect.getMetadata(SYSTEM_ROLES_KEY, SuperAdminSubscriptionsController),
    ).toEqual([SystemRole.SUPER_ADMIN]);
  });

  it('returns mapped subscription history for the organization', async () => {
    const { controller, listOrgSubscriptions, mapper } = createController();
    const useCaseResult = {
      subscriptions: [],
      activeCount: 2,
    };
    const mapped = {
      subscriptions: [
        {
          id: '22222222-2222-2222-2222-222222222222',
          status: SubscriptionLifecycleStatus.ACTIVE,
          isLatest: true,
        },
      ],
      activeCount: 2,
    };
    listOrgSubscriptions.execute.mockResolvedValue(useCaseResult);
    mapper.toHistoryResponse.mockReturnValue(mapped);

    await expect(controller.getSubscriptionHistory(ORG_ID)).resolves.toEqual(
      mapped,
    );
    expect(listOrgSubscriptions.execute).toHaveBeenCalledWith(
      new ListOrgSubscriptionsQuery(ORG_ID),
    );
    expect(mapper.toHistoryResponse).toHaveBeenCalledWith(useCaseResult);
  });
});
