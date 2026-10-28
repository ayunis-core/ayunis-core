import type { AssistantMessage, ToolUseContent } from '../contracts/message';
import type { Tool } from '../contracts/tool';

export const getToolUseContents = (
  message: AssistantMessage,
): ToolUseContent[] => {
  return message.content.filter(
    (content): content is ToolUseContent => content.type === 'tool_use',
  );
};

export const hasExternallyHandledToolCall = (
  message: AssistantMessage,
  tools: readonly Tool[],
): boolean => {
  const calls = getToolUseContents(message).map((call) => ({
    call,
    tool: tools.find((candidate) => candidate.name === call.name),
  }));
  const hasExternalCall = calls.some(
    ({ tool }) => tool !== undefined && tool.execute === undefined,
  );
  const allCallsValid = calls.every(
    ({ call, tool }) =>
      tool !== undefined && passesInputValidation(tool, call.input),
  );
  return hasExternalCall && allCallsValid;
};

// An invalid externally handled call must not end the loop: its error result has to
// reach the model in this run so it can retry with corrected input (AYC-675).
export const passesInputValidation = (
  tool: Tool,
  input: Record<string, unknown>,
): boolean => {
  try {
    tool.validateInput?.(input);
    return true;
  } catch {
    return false;
  }
};
