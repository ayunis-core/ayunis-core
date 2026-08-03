import type { AssistantMessage, ToolUseContent } from '../contracts/message';
import type { Tool } from '../contracts/tool';

export const getToolUseContents = (
  message: AssistantMessage,
): ToolUseContent[] => {
  return message.content.filter(
    (content): content is ToolUseContent => content.type === 'tool_use',
  );
};

export const hasDisplayOnlyToolCall = (
  message: AssistantMessage,
  tools: readonly Tool[],
): boolean => {
  const calls = getToolUseContents(message);
  return calls.some((call) => {
    const tool = tools.find((candidate) => candidate.name === call.name);
    return tool !== undefined && tool.execute === undefined;
  });
};
