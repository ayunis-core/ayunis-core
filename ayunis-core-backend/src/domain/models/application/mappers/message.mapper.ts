import type {
  Message as InferenceMessage,
  MessageContent as InferenceMessageContent,
} from '@ayunis/inference';
import type { Message } from 'src/domain/messages/domain/message.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { InferenceFailedError } from 'src/domain/models/application/models.errors';

/**
 * Maps the backend's domain messages to the provider-agnostic `Message` shape
 * the `@ayunis` provider packages consume. Provider-specific quirks (Anthropic
 * alternating-role merging, unsigned-thinking dropping, image block encoding,
 * …) are the provider packages' job — this mapper only translates to the
 * neutral type, resolving image bytes through the host's `ImageContentService`.
 */
export async function toInferenceMessages(
  messages: Message[],
  orgId: string,
  imageContentService: ImageContentService,
): Promise<InferenceMessage[]> {
  return Promise.all(
    messages.map((message) =>
      toInferenceMessage(message, orgId, imageContentService),
    ),
  );
}

async function toInferenceMessage(
  message: Message,
  orgId: string,
  imageContentService: ImageContentService,
): Promise<InferenceMessage> {
  if (message instanceof UserMessage) {
    const context = {
      orgId,
      threadId: message.threadId,
      messageId: message.id,
    };
    const content = await Promise.all(
      message.content.map((c) =>
        toUserContent(c, context, imageContentService),
      ),
    );
    return { role: 'user', content };
  }
  if (message instanceof AssistantMessage) {
    return {
      role: 'assistant',
      content: message.content.map(toAssistantContent),
    };
  }
  if (message instanceof ToolResultMessage) {
    return {
      role: 'tool_result',
      content: message.content.map((c) => ({
        type: 'tool_result',
        toolCallId: c.toolId,
        toolName: c.toolName,
        result: c.result,
      })),
    };
  }
  if (message instanceof SystemMessage) {
    return {
      role: 'system',
      content: message.content.map((c) => ({ type: 'text', text: c.text })),
    };
  }
  throw new InferenceFailedError('Unknown message type for inference mapping');
}

async function toUserContent(
  content: TextMessageContent | ImageMessageContent,
  context: { orgId: string; threadId: string; messageId: string },
  imageContentService: ImageContentService,
): Promise<InferenceMessageContent> {
  if (content instanceof TextMessageContent) {
    return { type: 'text', text: content.text };
  }
  if (content instanceof ImageMessageContent) {
    const { base64, contentType } =
      await imageContentService.convertImageToBase64(content, context);
    return { type: 'image', data: base64, mediaType: contentType };
  }
  throw new InferenceFailedError(
    'Unsupported user content type for inference mapping',
  );
}

function toAssistantContent(
  content: TextMessageContent | ToolUseMessageContent | ThinkingMessageContent,
): InferenceMessageContent {
  if (content instanceof ThinkingMessageContent) {
    return {
      type: 'thinking',
      thinking: content.thinking,
      id: content.id,
      signature: content.signature,
    };
  }
  if (content instanceof TextMessageContent) {
    return {
      type: 'text',
      text: content.text,
      providerMetadata: content.providerMetadata,
    };
  }
  if (content instanceof ToolUseMessageContent) {
    return {
      type: 'tool_use',
      id: content.id,
      name: content.name,
      input: content.params,
      providerMetadata: content.providerMetadata,
    };
  }
  throw new InferenceFailedError(
    'Unknown assistant content type for inference mapping',
  );
}
