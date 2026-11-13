import { mockTextResponse, mockToolCallResponse } from './mock-chunk-responses';
import type {
  ProviderChunk,
  ProviderRequest,
  ToolResultContent,
} from '@ayunis/inference';

const MCP_ECHO_PROMPT = 'E2E call MCP echo: ';
const MCP_ECHO_TOOL_PREFIX = 'mcp__tool__echo__';
const CALL_ID_PREFIX = 'mock-mcp-echo-';

/**
 * Calls the offered `echo` tool of the E2E MCP server with the text after the
 * trigger, then answers with the text of that call's result once it is in the
 * history, so a reply proves the tool really ran (or how it was settled).
 * Without the tool the default reply follows.
 */
export function mockMcpToolResponse(
  request: ProviderRequest,
  userText: string,
): AsyncIterable<ProviderChunk> | null {
  if (!userText.startsWith(MCP_ECHO_PROMPT)) return null;
  const result = echoResultSinceLastUserMessage(request);
  if (result) {
    return mockTextResponse(`mcp-tool-result::${resultText(result.result)}`);
  }
  const tool = request.tools.find((offered) =>
    offered.name.startsWith(MCP_ECHO_TOOL_PREFIX),
  );
  if (!tool) return null;
  return mockToolCallResponse(CALL_ID_PREFIX, tool.name, {
    text: userText.slice(MCP_ECHO_PROMPT.length),
  });
}

function echoResultSinceLastUserMessage(
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

/** MCP results arrive as JSON content blocks; other results (errors, rejections) are plain text. */
function resultText(result: string): string {
  try {
    const blocks: unknown = JSON.parse(result);
    if (Array.isArray(blocks)) {
      return blocks
        .map((block: { text?: unknown }) =>
          typeof block.text === 'string' ? block.text : '',
        )
        .join('');
    }
  } catch {
    // Not JSON: use the result as it is.
  }
  return result;
}
