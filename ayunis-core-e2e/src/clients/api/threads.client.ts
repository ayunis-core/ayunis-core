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

export function getThread(
  api: APIRequestContext,
  threadId: string,
): Promise<GetThreadResponseDto> {
  return generatedApi.threadsControllerFindOne(threadId, { api });
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

export function getThreadAiContextResponse(
  api: APIRequestContext,
  threadId: string,
): Promise<APIResponse> {
  return api.get(`${config.apiURL}/api/threads/${threadId}/ai-context`);
}

export function getThreadSourceCitationResponse(
  api: APIRequestContext,
  threadId: string,
  chunkId: string | null,
): Promise<APIResponse> {
  if (!chunkId) throw new Error('A source citation chunk ID is required');
  return api.get(
    `${config.apiURL}/api/threads/${threadId}/source-chunks/${chunkId}`,
  );
}

export async function deleteThread(
  api: APIRequestContext,
  threadId: string,
): Promise<void> {
  await generatedApi.threadsControllerDelete(threadId, { api });
}
