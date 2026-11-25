import type {
  ProviderChunk,
  ProviderRequest,
  ToolResultContent,
} from '@ayunis/inference';
import { mockTextResponse, mockToolCallResponse } from './mock-chunk-responses';

const CALL_PROMPT = /^E2E oparl call (oparl_\w+) (\{.*\})$/s;
const CALL_ID_PREFIX = 'mock-oparl-';

/**
 * "E2E oparl call <tool> <json>" calls the council information tool with
 * those arguments and answers `oparl-result::<tool result>`, or
 * `oparl-result::not-offered` when the run did not offer the tool.
 */
export function mockOparlResponse(
  request: ProviderRequest,
  userText: string,
): AsyncIterable<ProviderChunk> | null {
  const call = CALL_PROMPT.exec(userText);
  if (!call) return null;
  const [, toolName, args] = call;
  const result = resultSinceLastUserMessage(request);
  if (result) return mockTextResponse(`oparl-result::${result.result}`);
  if (!request.tools.some((tool) => tool.name === toolName)) {
    return mockTextResponse('oparl-result::not-offered');
  }
  return mockToolCallResponse(
    CALL_ID_PREFIX,
    toolName,
    JSON.parse(args) as Record<string, unknown>,
  );
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
