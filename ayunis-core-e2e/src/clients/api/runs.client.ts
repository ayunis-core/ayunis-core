import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { ActiveThreadRunResponseDto } from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';
import { config } from '../../config';

export const SLOW_TOOL_PREPARATION_PROMPT = 'E2E trigger slow tool preparation';

/**
 * Sends a message that keeps its run busy and stops listening right away;
 * the run carries on without the request.
 */
export async function sendMessageAndLeave(
  api: APIRequestContext,
  threadId: string,
): Promise<void> {
  await api
    .post(`${config.apiURL}/api/runs/send-message`, {
      multipart: {
        threadId,
        text: SLOW_TOOL_PREPARATION_PROMPT,
        streaming: 'true',
      },
      timeout: 1_500,
    })
    .catch(() => undefined);
}

export function listActiveRuns(
  api: APIRequestContext,
): Promise<ActiveThreadRunResponseDto[]> {
  return generatedApi.activeRunsControllerFindActive({ api });
}

export function requestRunAttach(
  api: APIRequestContext,
  threadId: string,
): Promise<APIResponse> {
  return api.get(`${config.apiURL}/api/runs/threads/${threadId}/events`, {
    timeout: 5_000,
  });
}

export function requestRunCancel(
  api: APIRequestContext,
  threadId: string,
): Promise<APIResponse> {
  return api.post(`${config.apiURL}/api/runs/threads/${threadId}/cancel`);
}
