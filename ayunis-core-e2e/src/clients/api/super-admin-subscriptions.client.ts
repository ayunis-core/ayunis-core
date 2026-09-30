import type { APIRequestContext, APIResponse } from '@playwright/test';
import type {
  ChangeSubscriptionRequestDto,
  CreateSubscriptionRequestDto,
  UpdateMonthlyCreditsDto,
} from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

export const e2eSubscriptionBilling = {
  companyName: 'E2E History GmbH',
  street: 'Test Street',
  houseNumber: '1',
  postalCode: '10115',
  city: 'Berlin',
  country: 'Germany',
} as const;

export function createSuperAdminSubscription(
  api: APIRequestContext,
  orgId: string,
  data: CreateSubscriptionRequestDto,
) {
  return generatedApi.superAdminSubscriptionsControllerCreateSubscription(
    orgId,
    data,
    { api },
  );
}

export function changeSuperAdminSubscription(
  api: APIRequestContext,
  orgId: string,
  data: ChangeSubscriptionRequestDto,
) {
  return generatedApi.superAdminSubscriptionsControllerChangeSubscription(
    orgId,
    data,
    { api },
  );
}

export function getSuperAdminSubscriptionHistory(
  api: APIRequestContext,
  orgId: string,
) {
  return generatedApi.superAdminSubscriptionsControllerGetSubscriptionHistory(
    orgId,
    { api },
  );
}

export function requestSuperAdminSubscriptionHistory(
  api: APIRequestContext,
  orgId: string,
): Promise<APIResponse> {
  return api.get(`/api/super-admin/subscriptions/${orgId}/history`);
}

export function cancelSuperAdminSubscription(
  api: APIRequestContext,
  orgId: string,
) {
  return generatedApi.superAdminSubscriptionsControllerCancelSubscription(
    orgId,
    { api },
  );
}

export function updateSuperAdminMonthlyCredits(
  api: APIRequestContext,
  orgId: string,
  data: UpdateMonthlyCreditsDto,
) {
  return generatedApi.superAdminSubscriptionsControllerUpdateMonthlyCredits(
    orgId,
    data,
    { api },
  );
}
