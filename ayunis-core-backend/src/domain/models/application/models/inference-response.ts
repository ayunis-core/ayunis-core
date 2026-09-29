import type { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import type { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import type { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import type { FinishReason } from '@ayunis/inference';

export class InferenceResponse {
  constructor(
    public content: Array<
      TextMessageContent | ToolUseMessageContent | ThinkingMessageContent
    >,
    public meta: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    },
    public finishReason?: FinishReason,
  ) {}
}
