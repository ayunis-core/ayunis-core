import type { ProviderChunk, ProviderRequest } from '@ayunis/inference';

export const MCP_APPROVAL_E2E_PROMPT = 'E2E trigger mcp approval: ';

const TOOL_CALL_ID = 'mock-mcp-approval-call';
const NAMESPACED_CREATE_DOCUMENT = /^mcp__tool__create_document__[0-9a-f]{8}$/;
const BUILT_IN_CREATE_DOCUMENT = 'create_document';
const CHUNK_DELAY_MS = 40;

export function parseMcpApprovalTitle(userText: string): string | null {
  return userText.startsWith(MCP_APPROVAL_E2E_PROMPT)
    ? userText.slice(MCP_APPROVAL_E2E_PROMPT.length)
    : null;
}

/**
 * E2E scenario for integration tools that wait for the user's approval. The
 * first turn calls the namespaced MCP `create_document` while the built-in
 * tool of the same upstream name is also offered, which is exactly the
 * Bremerhaven collision; the second turn echoes the tool result so the test
 * can see what the backend handed back after the user's decision.
 */
export function mcpApprovalResponse(
  request: ProviderRequest,
  title: string,
): AsyncIterable<ProviderChunk> {
  const toolResult = findToolResult(request);
  if (toolResult !== null) {
    return textChunks(`mcp-approval-complete::${toolResult}`);
  }
  const toolNames = request.tools.map((tool) => tool.name);
  const mcpToolName = toolNames.find((name) =>
    NAMESPACED_CREATE_DOCUMENT.test(name),
  );
  if (!mcpToolName || !toolNames.includes(BUILT_IN_CREATE_DOCUMENT)) {
    return textChunks(`mcp-approval-missing-tools::${toolNames.join(',')}`);
  }
  return toolCallChunks(mcpToolName, title);
}

function findToolResult(request: ProviderRequest): string | null {
  for (const message of request.messages) {
    if (message.role !== 'tool_result') continue;
    for (const content of message.content) {
      if (
        content.type === 'tool_result' &&
        content.toolCallId === TOOL_CALL_ID
      ) {
        return content.result;
      }
    }
  }
  return null;
}

async function* toolCallChunks(
  toolName: string,
  title: string,
): AsyncIterable<ProviderChunk> {
  await pause();
  yield {
    toolCallDeltas: [
      {
        index: 0,
        id: TOOL_CALL_ID,
        name: toolName,
        argumentsDelta: JSON.stringify({ title }),
      },
    ],
  };
  await pause();
  yield {
    finishReason: 'tool_calls',
    usage: { inputTokens: 0, outputTokens: 0 },
  };
}

async function* textChunks(text: string): AsyncIterable<ProviderChunk> {
  const middle = Math.ceil(text.length / 2);
  await pause();
  yield { textDelta: text.slice(0, middle) };
  await pause();
  yield {
    textDelta: text.slice(middle),
    finishReason: 'stop',
    usage: { inputTokens: 0, outputTokens: 0 },
  };
}

function pause(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
}
