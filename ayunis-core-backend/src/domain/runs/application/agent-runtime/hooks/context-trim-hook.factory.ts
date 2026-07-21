import type { Hook } from '@ayunis/agent-runtime';
import type {
  Message as InferenceMessage,
  MessageContent as InferenceMessageContent,
} from '@ayunis/inference';
import { Injectable } from '@nestjs/common';
import { CountTokensUseCase } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.use-case';
import { CountTokensCommand } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.command';

/**
 * Builds the context-trimming hook. Mirrors the legacy loop, which re-trims the
 * thread to the token budget before every model call: as the tool loop appends
 * assistant turns and tool results, `beforeModelCall` drops the oldest messages
 * so the prompt stays within `maxTokens`. A one-shot pre-run trim can't do this
 * because later iterations grow the message list. Trimming keeps a suffix that
 * starts at a user message; when no such suffix fits (e.g. a single oversized
 * user turn), the messages are left untouched so the provider — not the runtime
 * — decides, rather than sending an empty prompt.
 */
@Injectable()
export class ContextTrimHookFactory {
  constructor(private readonly countTokensUseCase: CountTokensUseCase) {}

  create(params: { maxTokens: number }): Hook {
    return {
      name: 'ayunis-context-trim',
      beforeModelCall: (ctx) => {
        ctx.transformMessages((messages) =>
          this.trim(messages, params.maxTokens),
        );
      },
    };
  }

  private trim(
    messages: readonly InferenceMessage[],
    maxTokens: number,
  ): InferenceMessage[] {
    const selected: InferenceMessage[] = [];
    let totalTokens = 0;

    for (let i = messages.length - 1; i >= 0; i--) {
      const tokens = this.countTokensForMessage(messages[i]);
      if (totalTokens + tokens > maxTokens) {
        break;
      }
      selected.unshift(messages[i]);
      totalTokens += tokens;
    }

    const trimmed = this.dropUntilFirstUser(selected);

    // Never emit an empty prompt: keep the untouched messages so the provider
    // can still accept a slightly over-budget prompt instead of the run failing.
    return trimmed.length > 0 ? trimmed : [...messages];
  }

  private dropUntilFirstUser(messages: InferenceMessage[]): InferenceMessage[] {
    const firstUserIndex = messages.findIndex((m) => m.role === 'user');
    if (firstUserIndex === -1) {
      return [];
    }
    return messages.slice(firstUserIndex);
  }

  private countTokensForMessage(message: InferenceMessage): number {
    const text = message.content
      .map((content) => extractText(content))
      .filter((chunk) => chunk.length > 0)
      .join('\n');

    if (text.length === 0) {
      return 0;
    }

    return this.countTokensUseCase.execute(new CountTokensCommand(text));
  }
}

function extractText(content: InferenceMessageContent): string {
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
