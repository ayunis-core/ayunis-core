import type { APIRequestContext } from '@playwright/test';
import type { PiiWhitelistEntryDto } from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

export async function getPiiWhitelist(
  api: APIRequestContext,
): Promise<PiiWhitelistEntryDto[]> {
  const { entries } =
    await generatedApi.anonymizationSettingsControllerGet({ api });
  return entries;
}

export async function setPiiWhitelist(
  api: APIRequestContext,
  entries: PiiWhitelistEntryDto[],
): Promise<void> {
  await generatedApi.anonymizationSettingsControllerUpdate(
    { entries },
    { api },
  );
}
