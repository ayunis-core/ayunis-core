import type {
  ProviderChunk,
  ProviderRequest,
  ToolResultContent,
} from '@ayunis/inference';
import { mockTextResponse, mockToolCallResponse } from './mock-chunk-responses';

const REPORT_PROMPT = 'E2E report past chats';
const CALL_PROMPT = /^E2E past chats call (chat_\w+) (\{.*\})$/s;
const CALL_ID_PREFIX = 'mock-past-chats-';

/**
 * Lets E2E specs observe the past-chat tools. "E2E report past chats" answers
 * with the past-chat tools offered and whether their guidance is in the
 * prompt. "E2E past chats call <tool> <json>" calls the tool with those
 * arguments and then answers with its result, or says it was not offered.
 */
export function mockPastChatsResponse(
  request: ProviderRequest,
  userText: string,
): AsyncIterable<ProviderChunk> | null {
  if (userText === REPORT_PROMPT) {
    return mockTextResponse(pastChatsReport(request));
  }
  const call = CALL_PROMPT.exec(userText);
  if (!call) return null;
  const [, toolName, args] = call;
  const result = resultSinceLastUserMessage(request);
  if (result) return mockTextResponse(`past-chats-result::${result.result}`);
  if (!request.tools.some((tool) => tool.name === toolName)) {
    return mockTextResponse('past-chats-result::not-offered');
  }
  return mockToolCallResponse(
    CALL_ID_PREFIX,
    toolName,
    JSON.parse(args) as Record<string, unknown>,
  );
}

function pastChatsReport(request: ProviderRequest): string {
  const tools = request.tools
    .map((tool) => tool.name)
    .filter((name) => name.startsWith('chat_'));
  return [
    'past-chats-report',
    `tools=${tools.join(',') || 'none'}`,
    `section=${request.instructions.includes('<past_chats>') ? 'yes' : 'no'}`,
  ].join('::');
}

function resultSinceLastUserMessage(
  request: ProviderRequest,
): ToolResultContent | undefined {
  const lastUser = request.messages.findLastIndex(
    (message) => message.role === 'user',
  );
  return request.messages
    .slice(lastUser + 1)
    .flatMap((message) => message.content)
    .find(
      (part): part is ToolResultContent =>
        part.type === 'tool_result' &&
        part.toolCallId.startsWith(CALL_ID_PREFIX),
    );
}
