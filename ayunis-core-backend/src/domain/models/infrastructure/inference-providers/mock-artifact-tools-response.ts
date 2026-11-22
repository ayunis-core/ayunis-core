import type {
  ProviderChunk,
  ProviderRequest,
  ToolResultContent,
} from '@ayunis/inference';
import { mockTextResponse, mockToolCallResponse } from './mock-chunk-responses';

const CALL_PROMPT =
  /^E2E artifact call ((?:create|update|read)_(?:diagram|spreadsheet|document)|edit_document) (\{.*\})$/s;
const CALL_ID_PREFIX = 'mock-artifact-tool-';

/**
 * Lets E2E specs drive the artifact tools. "E2E artifact call <tool> <json>"
 * calls the tool with those arguments and then answers with its result, or
 * says it was not offered.
 */
export function mockArtifactToolsResponse(
  request: ProviderRequest,
  userText: string,
): AsyncIterable<ProviderChunk> | null {
  const call = CALL_PROMPT.exec(userText);
  if (!call) return null;
  const [, toolName, args] = call;
  const result = resultSinceLastUserMessage(request);
  if (result) return mockTextResponse(`artifact-tool-result::${result.result}`);
  if (!request.tools.some((tool) => tool.name === toolName)) {
    return mockTextResponse('artifact-tool-result::not-offered');
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
