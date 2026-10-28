import type {
  Message,
  ToolResultContent,
  ToolUseContent,
} from '@ayunis/inference';

// Providers reject a history in which a tool call has no result, so the
// model is told the call ended without one. Calls stay unanswered when the
// user moves past an interactive widget (AYC-1259).
export const UNANSWERED_TOOL_CALL_RESULT =
  'Not completed: this action did not return a result.';

export interface PairedToolResults {
  messages: Message[];
  placeholderCount: number;
  droppedResultCount: number;
}

/**
 * Makes every assistant tool call directly followed by one result message
 * answering it, in call order. A call's result is taken from wherever it was
 * persisted (a run that was still finishing can store it after a later user
 * message), so a completed call is never reported as unanswered; only a call
 * with no result anywhere gets the placeholder. Results answering no call are
 * dropped, as are second results for an already answered call.
 */
export function pairToolResults(
  messages: readonly Message[],
): PairedToolResults {
  const resultById = firstResultPerCall(messages);
  const paired: PairedToolResults = {
    messages: [],
    placeholderCount: 0,
    droppedResultCount: countResults(messages),
  };
  for (const message of messages) {
    if (message.role === 'tool_result') continue;
    paired.messages.push(message);
    const calls = toolCallsOf(message);
    if (calls.length === 0) continue;
    const content = calls.map((call) => {
      const answer = resultById.get(call.id);
      if (answer) {
        resultById.delete(call.id);
        paired.droppedResultCount -= 1;
        return answer;
      }
      paired.placeholderCount += 1;
      return placeholderFor(call);
    });
    paired.messages.push({ role: 'tool_result', content });
  }
  return paired;
}

function firstResultPerCall(
  messages: readonly Message[],
): Map<string, ToolResultContent> {
  const resultById = new Map<string, ToolResultContent>();
  for (const result of messages.flatMap(toolResultsOf)) {
    if (!resultById.has(result.toolCallId)) {
      resultById.set(result.toolCallId, result);
    }
  }
  return resultById;
}

function countResults(messages: readonly Message[]): number {
  return messages.flatMap(toolResultsOf).length;
}

function placeholderFor(call: ToolUseContent): ToolResultContent {
  return {
    type: 'tool_result',
    toolCallId: call.id,
    toolName: call.name,
    result: UNANSWERED_TOOL_CALL_RESULT,
  };
}

function toolCallsOf(message: Message): ToolUseContent[] {
  if (message.role !== 'assistant') return [];
  return message.content.filter(
    (content): content is ToolUseContent => content.type === 'tool_use',
  );
}

function toolResultsOf(message: Message): ToolResultContent[] {
  if (message.role !== 'tool_result') return [];
  return message.content.filter(
    (content): content is ToolResultContent => content.type === 'tool_result',
  );
}
