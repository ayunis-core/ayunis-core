import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { GetThreadResponseDto } from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';
import { config } from '../../config';

export async function createEmptyThread(
  api: APIRequestContext,
  permittedModelId: string,
): Promise<GetThreadResponseDto> {
  return generatedApi.threadsControllerCreate(
    { modelId: permittedModelId, isAnonymous: false },
    { api },
  );
}

export function sendThreadMessage(
  api: APIRequestContext,
  threadId: string,
  text: string,
): Promise<APIResponse> {
  return api.post(`${config.apiURL}/api/runs/send-message`, {
    multipart: { threadId, text, streaming: 'true' },
  });
}

export async function deleteThread(
  api: APIRequestContext,
  threadId: string,
): Promise<void> {
  await generatedApi.threadsControllerDelete(threadId, { api });
}
