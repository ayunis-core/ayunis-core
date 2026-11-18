import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from '../../config';
import type { TextMessageContentResponseDto } from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';
import { getEffectiveDefaultModel } from './models.client';
import { createEmptyThread, getThread } from './threads.client';

/** Mock inference stores the text after this prefix as `personal`. */
export const REMEMBER_PROMPT = 'E2E remember: ';
/** Mock inference answers with what the run offered for memory. */
export const REPORT_MEMORY_PROMPT = 'E2E report memory';

export interface MemoryReport {
  tools: string;
  section: string;
  nudge: string;
  personal: string;
}

export async function readPersonalMemory(
  api: APIRequestContext,
): Promise<string | undefined> {
  const memory = await generatedApi.memoryControllerFindAll({ api });
  return memory.entries.find((entry) => entry.key === 'personal')?.content;
}

export function clearMemory(api: APIRequestContext): Promise<void> {
  return generatedApi.memoryControllerClear({ api });
}

/** A new chat on the user's default model. */
export async function createChat(api: APIRequestContext): Promise<string> {
  const model = await getEffectiveDefaultModel(api);
  if (!model) throw new Error('The user has no default model');
  return (await createEmptyThread(api, model.id)).id;
}

export function requestMemory(
  api: APIRequestContext,
  apiURL = config.apiURL,
): Promise<APIResponse> {
  return api.get(`${apiURL}/api/memory`);
}

/**
 * Sends a message to the thread and returns the text of the assistant's
 * answer once the run has finished.
 */
export async function chat(
  api: APIRequestContext,
  threadId: string,
  text: string,
  apiURL = config.apiURL,
): Promise<string> {
  const response = await api.post(`${apiURL}/api/runs/send-message`, {
    multipart: { threadId, text, streaming: 'true' },
  });
  const body = await response.text();
  if (!response.ok() || body.includes('"type":"error"')) {
    throw new Error(`Run failed (${response.status()}): ${body}`);
  }
  const { messages } = await getThread(api, threadId);
  const answer = messages.at(-1);
  if (answer?.role !== 'assistant') {
    throw new Error(`Run ended without an answer: ${body}`);
  }
  return answer.content
    .filter(
      (content): content is TextMessageContentResponseDto =>
        content.type === 'text',
    )
    .map((content) => content.text)
    .join('');
}

export async function reportMemory(
  api: APIRequestContext,
  threadId: string,
  apiURL = config.apiURL,
): Promise<MemoryReport> {
  const answer = await chat(api, threadId, REPORT_MEMORY_PROMPT, apiURL);
  const fields = answer.split('::');
  if (fields[0] !== 'memory-report') {
    throw new Error(`Not a memory report: ${answer}`);
  }
  return Object.fromEntries(
    fields.slice(1).map((field) => {
      const separator = field.indexOf('=');
      return [field.slice(0, separator), field.slice(separator + 1)];
    }),
  ) as unknown as MemoryReport;
}
