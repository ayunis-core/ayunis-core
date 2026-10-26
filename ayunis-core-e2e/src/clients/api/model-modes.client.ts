import type { APIRequestContext } from '@playwright/test';
import type { ModelModeEntryDto } from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

type Mode = 'auto' | 'max';

export function getModelModeEntries(
  superAdminApi: APIRequestContext,
  mode: Mode,
): Promise<ModelModeEntryDto[]> {
  return generatedApi.superAdminModelModesControllerGetEntries(mode, {
    api: superAdminApi,
  });
}

export function replaceModelModeEntries(
  superAdminApi: APIRequestContext,
  mode: Mode,
  entries: ModelModeEntryDto[],
): Promise<void> {
  return generatedApi.superAdminModelModesControllerReplaceEntries(
    mode,
    { entries },
    { api: superAdminApi },
  );
}
