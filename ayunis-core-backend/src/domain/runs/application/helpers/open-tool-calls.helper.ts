import type { MessageContent } from 'src/domain/messages/domain/message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';

/**
 * The calls of the thread's latest assistant turn that no result answers yet.
 * A run that ends on a call awaiting a client result still stores the results
 * of that call's siblings, so the open call can sit behind a tool-result
 * message.
 */
export function findOpenToolCalls(thread: Thread): ToolUseMessageContent[] {
  const last = thread.getLastMessage();
  if (!(last instanceof ToolResultMessage)) return toolCallsIn(last?.content);

  const answered = new Set<string>();
  let index = thread.messages.length - 1;
  for (; thread.messages[index] instanceof ToolResultMessage; index--) {
    for (const content of thread.messages[index].content) {
      if (content instanceof ToolResultMessageContent) {
        answered.add(content.toolId);
      }
    }
  }
  return toolCallsIn(thread.messages[index]?.content).filter(
    (call) => !answered.has(call.id),
  );
}

function toolCallsIn(
  contents: readonly MessageContent[] = [],
): ToolUseMessageContent[] {
  return contents.filter(
    (content): content is ToolUseMessageContent =>
      content instanceof ToolUseMessageContent,
  );
}
