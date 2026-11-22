import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { GetThreadResponseDto } from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';
import { config } from '../../config';

export async function createEmptyThread(
  api: APIRequestContext,
  permittedModelId: string,
  isAnonymous = false,
): Promise<GetThreadResponseDto> {
  return generatedApi.threadsControllerCreate(
    { modelId: permittedModelId, isAnonymous },
    { api },
  );
}

export function getThread(
  api: APIRequestContext,
  threadId: string,
): Promise<GetThreadResponseDto> {
  return generatedApi.threadsControllerFindOne(threadId, { api });
}

export async function attachMcpIntegration(
  api: APIRequestContext,
  threadId: string,
  integrationId: string,
): Promise<void> {
  await generatedApi.threadMcpIntegrationsControllerAddMcpIntegration(
    threadId,
    integrationId,
    { api },
  );
}

export function sendThreadMessage(
  api: APIRequestContext,
  threadId: string,
  text: string,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.post(`${apiURL}/api/runs/send-message`, {
    multipart: { threadId, text, streaming: 'true' },
  });
}

export function sendThreadMessageWithImage(
  api: APIRequestContext,
  threadId: string,
  text: string,
  image: { name: string; mimeType: string; buffer: Buffer },
): Promise<APIResponse> {
  return api.post(`${config.apiURL}/api/runs/send-message`, {
    multipart: { threadId, text, streaming: 'true', images: image },
  });
}

// The multipart upload predating direct uploads: the source gets no stored
// original.
export async function uploadLegacyThreadPdf(
  api: APIRequestContext,
  threadId: string,
  filename: string,
  buffer: Buffer,
): Promise<string> {
  const response = await api.post(
    `${config.apiURL}/api/threads/${threadId}/sources/file`,
    {
      multipart: {
        file: { name: filename, mimeType: 'application/pdf', buffer },
      },
    },
  );
  if (!response.ok()) {
    throw new Error(`Legacy upload failed: ${response.status()}`);
  }
  const [source] = (await response.json()) as { id: string }[];
  return source.id;
}

export function uploadThreadTextSource(
  api: APIRequestContext,
  threadId: string,
  filename: string,
  content: string,
): Promise<APIResponse> {
  return api.post(`${config.apiURL}/api/threads/${threadId}/sources/file`, {
    multipart: {
      file: {
        name: filename,
        mimeType: 'text/plain',
        buffer: Buffer.from(content, 'utf8'),
      },
    },
  });
}

export function uploadThreadCsv(
  api: APIRequestContext,
  threadId: string,
  filename: string,
  content: string,
): Promise<APIResponse> {
  return api.post(`${config.apiURL}/api/threads/${threadId}/sources/file`, {
    multipart: {
      file: {
        name: filename,
        mimeType: 'text/csv',
        buffer: Buffer.from(content, 'utf8'),
      },
    },
  });
}

export function getThreadAiContextResponse(
  api: APIRequestContext,
  threadId: string,
): Promise<APIResponse> {
  return api.get(`${config.apiURL}/api/threads/${threadId}/ai-context`);
}

/** `apiURL` targets another backend, e.g. the one with recordings disabled. */
export function getThreadSourceCitationResponse(
  api: APIRequestContext,
  threadId: string,
  chunkId: string | null,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  if (!chunkId) throw new Error('A source citation chunk ID is required');
  return api.get(`${apiURL}/api/threads/${threadId}/source-chunks/${chunkId}`);
}

export function getGeneratedImageResponse(
  api: APIRequestContext,
  threadId: string,
  imageId: string,
): Promise<APIResponse> {
  return api.get(
    `${config.apiURL}/api/threads/${threadId}/generated-images/${imageId}`,
  );
}

export async function deleteThread(
  api: APIRequestContext,
  threadId: string,
): Promise<void> {
  await generatedApi.threadsControllerDelete(threadId, { api });
}
