import type { ToolCallDecisionDto } from '@ayunis/api-client/schemas';
import type { ApiTransport } from '@ayunis/api-client/transport';

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

export interface RunEndpoints {
  send: (payload: RunMessagePayload, signal: AbortSignal) => Promise<Response>;
  follow?: (threadId: string, signal: AbortSignal) => Promise<Response>;
  cancel?: (threadId: string) => Promise<unknown>;
}

const streamHeaders = {
  Accept: 'text/event-stream',
  'Cache-Control': 'no-cache',
};

function messageForm(payload: RunMessagePayload): FormData {
  const form = new FormData();
  form.append('threadId', payload.threadId);
  if (payload.text !== undefined) form.append('text', payload.text);
  for (const image of payload.images ?? []) form.append('images', image);
  if (payload.imageAltTexts?.length)
    form.append('imageAltTexts', JSON.stringify(payload.imageAltTexts));
  if (payload.toolResult)
    form.append('toolResult', JSON.stringify(payload.toolResult));
  if (payload.decisions)
    form.append('decisions', JSON.stringify(payload.decisions));
  if (payload.skillId) form.append('skillId', payload.skillId);
  if (payload.streaming !== undefined)
    form.append('streaming', String(payload.streaming));
  return form;
}

export function createAuthenticatedRunEndpoints(
  fetch: ApiTransport['fetch'],
  cancel: NonNullable<RunEndpoints['cancel']>,
): Required<RunEndpoints> {
  return {
    send: (payload, signal) =>
      fetch('/runs/send-message', {
        method: 'POST',
        headers: streamHeaders,
        body: messageForm(payload),
        signal,
      }),
    follow: (threadId, signal) =>
      fetch(`/runs/threads/${threadId}/events`, {
        method: 'GET',
        headers: streamHeaders,
        signal,
      }),
    cancel,
  };
}
