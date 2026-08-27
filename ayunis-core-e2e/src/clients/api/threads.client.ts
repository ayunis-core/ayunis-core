import type { APIRequestContext } from '@playwright/test';
import type { GetThreadResponseDto } from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

export async function createEmptyThread(
  api: APIRequestContext,
  permittedModelId: string,
): Promise<GetThreadResponseDto> {
  return generatedApi.threadsControllerCreate(
    { modelId: permittedModelId, isAnonymous: false },
    { api },
  );
}

export async function deleteThread(
  api: APIRequestContext,
  threadId: string,
): Promise<void> {
  await generatedApi.threadsControllerDelete(threadId, { api });
}
