import type { AssistantMessage, ToolUseContent } from '../contracts/message';
import type { Tool } from '../contracts/tool';

export const getToolUseContents = (
  message: AssistantMessage,
): ToolUseContent[] => {
  return message.content.filter(
    (content): content is ToolUseContent => content.type === 'tool_use',
  );
};

/**
 * The loop exits when the model requests no tool calls, or when any
 * requested tool is display-only (no `execute`) — the call is surfaced to
 * the consumer instead of being executed.
 */
export const shouldExitLoop = (
  message: AssistantMessage,
  tools: readonly Tool[],
): boolean => {
  const calls = getToolUseContents(message);
  if (calls.length === 0) {
    return true;
  }
  return calls.some((call) => {
    const tool = tools.find((candidate) => candidate.name === call.name);
    return tool !== undefined && tool.execute === undefined;
  });
};
