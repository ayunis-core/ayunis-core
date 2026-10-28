import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import {
  aUserContext,
  createMockContextService,
  getFromStore,
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/common/context/testing/context.fixtures';
import { UnauthorizedSubscriptionAccessError } from 'src/iam/subscriptions/application/subscription.errors';
import { validateSubscriptionAccess } from 'src/iam/subscriptions/application/util/validate-subscription-access';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

const OTHER_ORG_ID = '33333333-3333-4333-8333-333333333333' as UUID;
const API_KEY_ID = '44444444-4444-4444-8444-444444444444' as UUID;

describe('validateSubscriptionAccess', () => {
  it('allows a super admin to manage another organisation', () => {
    const context = createMockContextService(
      aUserContext({
        role: UserRole.USER,
        systemRole: SystemRole.SUPER_ADMIN,
      }),
    );

    expect(() =>
      validateSubscriptionAccess(context, TEST_USER_ID, OTHER_ORG_ID),
    ).not.toThrow();
  });

  it('allows an organisation admin for their own organisation', () => {
    const context = createMockContextService(
      aUserContext({
        role: UserRole.ADMIN,
        systemRole: SystemRole.CUSTOMER,
      }),
    );

    expect(() =>
      validateSubscriptionAccess(context, TEST_USER_ID, TEST_ORG_ID),
    ).not.toThrow();
  });

  it('rejects an organisation admin for another organisation', () => {
    const context = createMockContextService(
      aUserContext({
        role: UserRole.ADMIN,
        systemRole: SystemRole.CUSTOMER,
      }),
    );

    expect(() =>
      validateSubscriptionAccess(context, TEST_USER_ID, OTHER_ORG_ID),
    ).toThrow(UnauthorizedSubscriptionAccessError);
  });

  it('rejects an ordinary member of the target organisation', () => {
    const context = createMockContextService(
      aUserContext({
        role: UserRole.USER,
        systemRole: SystemRole.CUSTOMER,
      }),
    );

    expect(() =>
      validateSubscriptionAccess(context, TEST_USER_ID, TEST_ORG_ID),
    ).toThrow(UnauthorizedSubscriptionAccessError);
  });

  it('rejects an api key even when systemRole is super admin', () => {
    const context = createMockContextService();
    context.get.mockImplementation(
      getFromStore({
        orgId: TEST_ORG_ID,
        apiKeyId: API_KEY_ID,
        systemRole: SystemRole.SUPER_ADMIN,
      }) as ContextService['get'],
    );

    expect(() =>
      validateSubscriptionAccess(context, TEST_USER_ID, TEST_ORG_ID),
    ).toThrow(UnauthorizedSubscriptionAccessError);
  });

  it('rejects a missing context', () => {
    const context = createMockContextService();
    context.get.mockReturnValue(undefined);

    expect(() =>
      validateSubscriptionAccess(context, TEST_USER_ID, TEST_ORG_ID),
    ).toThrow(UnauthorizedSubscriptionAccessError);
  });
});
