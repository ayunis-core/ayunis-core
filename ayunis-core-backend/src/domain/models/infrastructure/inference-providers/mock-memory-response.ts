import type { ProviderChunk, ProviderRequest } from '@ayunis/inference';
import { mockTextResponse, mockToolCallResponse } from './mock-chunk-responses';

const REMEMBER_PROMPT = 'E2E remember: ';
const REPORT_PROMPT = 'E2E report memory';
const CALL_ID_PREFIX = 'mock-memory-';

/**
 * Lets E2E specs observe memory in a chat run. "E2E remember: <text>" stores
 * the text as `personal` through `set_memory`. "E2E report memory" answers
 * with what the request carried: the memory tools offered, whether the
 * memory reminder was added, and the `personal` entry from the prompt.
 */
export function mockMemoryResponse(
  request: ProviderRequest,
  userText: string,
): AsyncIterable<ProviderChunk> | null {
  if (userText.startsWith(REMEMBER_PROMPT) && offers(request, 'set_memory')) {
    return answeredSinceLastUserMessage(request)
      ? mockTextResponse('memory-stored')
      : mockToolCallResponse(CALL_ID_PREFIX, 'set_memory', {
          key: 'personal',
          content: userText.slice(REMEMBER_PROMPT.length),
        });
  }
  if (userText === REPORT_PROMPT) {
    return mockTextResponse(memoryReport(request));
  }
  return null;
}

function memoryReport(request: ProviderRequest): string {
  const tools = request.tools
    .map((tool) => tool.name)
    .filter((name) => name === 'get_memory' || name === 'set_memory');
  const nudged = request.messages.some(
    (message) =>
      message.role === 'system' &&
      message.content.some(
        (part) => part.type === 'text' && part.text.includes('Memory check-in'),
      ),
  );
  const personal = /<personal>\n([\s\S]*?)\n<\/personal>/.exec(
    request.instructions,
  )?.[1];
  return [
    'memory-report',
    `tools=${tools.join(',') || 'none'}`,
    `section=${request.instructions.includes('<memory>') ? 'yes' : 'no'}`,
    `nudge=${nudged ? 'yes' : 'no'}`,
    `personal=${personal ?? 'none'}`,
  ].join('::');
}

function offers(request: ProviderRequest, toolName: string): boolean {
  return request.tools.some((tool) => tool.name === toolName);
}

function answeredSinceLastUserMessage(request: ProviderRequest): boolean {
  const lastUser = request.messages.findLastIndex(
    (message) => message.role === 'user',
  );
  return request.messages
    .slice(lastUser + 1)
    .some((message) => message.role === 'tool_result');
}
