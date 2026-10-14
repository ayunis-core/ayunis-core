import type {
  Message,
  MessageContent,
  ReadonlySnapshot,
} from '@ayunis/agent-runtime';
import type { MessagePart } from 'src/common/token-counter/application/util/context-budget.helper';

export function toRuntimeBudgetParts(
  message: ReadonlySnapshot<Message>,
): MessagePart[] {
  return message.content.map((content) =>
    content.type === 'image'
      ? { kind: 'image' }
      : { kind: 'text', text: runtimeContentText(content) },
  );
}

function runtimeContentText(content: ReadonlySnapshot<MessageContent>): string {
  switch (content.type) {
    case 'text':
      return content.text;
    case 'thinking':
      return content.thinking;
    case 'tool_use':
      return `${content.id} ${content.name} ${JSON.stringify(content.input)}`;
    case 'tool_result':
      return `${content.toolCallId} ${content.toolName} ${content.result}`;
    case 'image':
      return '';
  }
}
