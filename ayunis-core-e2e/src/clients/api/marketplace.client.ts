import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../../config';

export function requestInstallMarketplaceSkill(
  api: APIRequestContext,
  identifier: string,
): Promise<APIResponse> {
  return api.post(`${config.apiURL}/api/skills/install-from-marketplace`, {
    data: { identifier },
  });
}
