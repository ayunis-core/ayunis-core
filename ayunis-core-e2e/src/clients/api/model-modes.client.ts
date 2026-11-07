import type { APIRequestContext } from '@playwright/test';
import type {
  DefaultModelSelectionResponseDto,
  ModelModeEntryDto,
} from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

type Mode = 'auto' | 'max';

export function setOrgModeDefault(
  api: APIRequestContext,
  mode: Mode,
): Promise<void> {
  return generatedApi.modelModeDefaultsControllerSetOrgModeDefault(
    { mode },
    { api },
  );
}

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

/** What a new chat of the signed-in user starts with. */
export function getDefaultModelSelection(
  api: APIRequestContext,
): Promise<DefaultModelSelectionResponseDto> {
  return generatedApi.modelModeDefaultsControllerGetDefaultSelection({ api });
}
