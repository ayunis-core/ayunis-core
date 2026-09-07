import type { APIRequestContext } from '@playwright/test';
import { login } from './auth.client';
import { generatedApi } from './generated-api';

export async function ensureUsageSubscription(
  adminApi: APIRequestContext,
  superAdminApi: APIRequestContext,
): Promise<void> {
  const usage = await getOrganizationCreditUsage(adminApi);
  if (usage.monthlyCredits !== null) return;
  const principal = await generatedApi.authenticationControllerMe({
    api: adminApi,
  });
  await login(superAdminApi, 'admin@demo.local', 'admin');
  await generatedApi.superAdminSubscriptionsControllerCreateSubscription(
    principal.orgId,
    {
      companyName: 'E2E Credit Limits',
      street: 'Test Street',
      houseNumber: '1',
      postalCode: '10115',
      city: 'Berlin',
      country: 'Germany',
      type: 'USAGE_BASED',
      monthlyCredits: 10000,
    },
    { api: superAdminApi },
  );
}

export function getOrganizationCreditUsage(api: APIRequestContext) {
  return generatedApi.usageControllerGetCreditUsage({ api });
}

export async function getTeamCreditLimit(
  api: APIRequestContext,
  teamId: string,
) {
  const limits = await generatedApi.creditLimitsControllerGetTeamLimits({
    api,
  });
  return (
    limits.find((limit) => limit.teamId === teamId)?.monthlyCredits ?? null
  );
}

export async function getUserCreditLimit(
  api: APIRequestContext,
  userId: string,
) {
  const limits = await generatedApi.creditLimitsControllerGetUserLimits({
    api,
  });
  return (
    limits.find((limit) => limit.userId === userId)?.monthlyCredits ?? null
  );
}

export function getAuthenticatedCreditPrincipal(api: APIRequestContext) {
  return generatedApi.authenticationControllerMe({ api });
}

export async function deleteCreditLimitMember(
  adminApi: APIRequestContext,
  userId: string,
): Promise<void> {
  await generatedApi.userControllerDeleteUser(userId, { api: adminApi });
}
