import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { RunInvalidInputError } from 'src/domain/runs/application/runs.errors';
import type { Thread } from 'src/domain/threads/domain/thread.entity';

export function findPendingToolCall(
  thread: Thread,
  toolId: string,
): ToolUseMessageContent {
  const pending = thread
    .getLastMessage()
    ?.content.find(
      (content): content is ToolUseMessageContent =>
        content instanceof ToolUseMessageContent && content.id === toolId,
    );
  if (!pending) {
    throw new RunInvalidInputError(
      'No pending tool call to attach this result to',
    );
  }
  return pending;
}
