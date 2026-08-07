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
  const displayOnlyCalls = getToolUseContents(message)
    .map((call) => ({
      call,
      tool: tools.find((candidate) => candidate.name === call.name),
    }))
    .filter(({ tool }) => tool !== undefined && tool.execute === undefined);
  // Every display-only call must validate for the turn to end — one invalid
  // sibling keeps the loop running so its error result reaches the model in
  // this run instead of staying unretried in the terminal turn.
  return (
    displayOnlyCalls.length > 0 &&
    displayOnlyCalls.every(({ call, tool }) =>
      passesInputValidation(tool!, call.input),
    )
  );
};

// An invalid display-only call must not end the loop: its error result has to
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
