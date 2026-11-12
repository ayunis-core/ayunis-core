import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../../config';
import { generatedApi } from './generated-api';

/** The selected permit id, or null when summaries use the org default. */
export async function getRecordingSummaryModelId(
  api: APIRequestContext,
): Promise<string | null> {
  const { permittedLanguageModel } =
    await generatedApi.recordingSummaryModelControllerGetRecordingSummaryModel({
      api,
    });
  return permittedLanguageModel?.id ?? null;
}

export async function setRecordingSummaryModel(
  api: APIRequestContext,
  permittedModelId: string | null,
): Promise<void> {
  await generatedApi.recordingSummaryModelControllerSetRecordingSummaryModel(
    { permittedModelId },
    { api },
  );
}

// Raw requests for asserting the status of calls that may be denied; `apiURL`
// targets another backend (e.g. the one started with recordings disabled).
export function requestRecordingSummaryModel(
  api: APIRequestContext,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.get(`${apiURL}/api/models/org/recording-summary-model`);
}

export function requestRecordingSummaryModelChange(
  api: APIRequestContext,
  permittedModelId: string | null,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.put(`${apiURL}/api/models/org/recording-summary-model`, {
    data: { permittedModelId },
  });
}
