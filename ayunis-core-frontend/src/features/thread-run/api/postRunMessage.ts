import config from '@/shared/config';
import type { ToolCallDecisionDto } from '@/shared/api';

export interface RunMessagePayload {
  threadId: string;
  text?: string;
  images?: File[];
  imageAltTexts?: string[];
  toolResult?: {
    toolId: string;
    toolName: string;
    result: string;
  };
  decisions?: ToolCallDecisionDto[];
  skillId?: string;
  streaming?: boolean;
}

export function postRunMessage(
  payload: RunMessagePayload,
  signal: AbortSignal,
): Promise<Response> {
  const formData = new FormData();
  formData.append('threadId', payload.threadId);

  if (payload.text !== undefined) {
    formData.append('text', payload.text);
  }

  if (payload.images && payload.images.length > 0) {
    for (const image of payload.images) {
      formData.append('images', image);
    }
  }

  if (payload.imageAltTexts && payload.imageAltTexts.length > 0) {
    formData.append('imageAltTexts', JSON.stringify(payload.imageAltTexts));
  }

  if (payload.toolResult) {
    formData.append('toolResult', JSON.stringify(payload.toolResult));
  }

  if (payload.decisions) {
    formData.append('decisions', JSON.stringify(payload.decisions));
  }

  if (payload.skillId) {
    formData.append('skillId', payload.skillId);
  }

  if (payload.streaming !== undefined) {
    formData.append('streaming', String(payload.streaming));
  }

  return fetch(`${config.api.baseUrl}/runs/send-message`, {
    method: 'POST',
    headers: {
      // Don't set Content-Type - browser will set it with boundary for multipart
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
    credentials: 'include',
    body: formData,
    signal,
  });
}
