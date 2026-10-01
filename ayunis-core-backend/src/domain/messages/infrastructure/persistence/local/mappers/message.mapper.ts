import { Injectable } from '@nestjs/common';
import { Message } from 'src/domain/messages/domain/message.entity';
import {
  MessageRecord,
  type MessageContentData,
} from 'src/domain/messages/infrastructure/persistence/local/schema/message.record';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import { MessageContent } from 'src/domain/messages/domain/message-content.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';

type MessageBase = Pick<MessageRecord, 'id' | 'threadId' | 'createdAt'>;

@Injectable()
export class MessageMapper {
  toRecord(message: Message): MessageRecord {
    const record = new MessageRecord();
    record.id = message.id;
    record.threadId = message.threadId;
    record.role = message.role;
    record.createdAt = message.createdAt;
    record.content = message.content.map((content) => toContentRecord(content));
    return record;
  }

  toDomain(messageEntity: MessageRecord): Message {
    const base: MessageBase = {
      id: messageEntity.id,
      threadId: messageEntity.threadId,
      createdAt: messageEntity.createdAt,
    };
    switch (messageEntity.role) {
      case MessageRole.USER:
        return new UserMessage({
          ...base,
          content: messageEntity.content.map(toUserContent),
        });
      case MessageRole.ASSISTANT:
        return new AssistantMessage({
          ...base,
          content: messageEntity.content.map(toAssistantContent),
        });
      case MessageRole.TOOL:
        return new ToolResultMessage({
          ...base,
          content: messageEntity.content.map(toToolResultContent),
        });
      case MessageRole.SYSTEM:
        return new SystemMessage({
          ...base,
          content: messageEntity.content.map(toSystemContent),
        });
      default:
        throw new Error('Invalid message role');
    }
  }
}

function toContentRecord(content: MessageContent): MessageContentData {
  if (content instanceof TextMessageContent) return toTextRecord(content);
  if (content instanceof ToolUseMessageContent) return toToolUseRecord(content);
  if (content instanceof ToolResultMessageContent) {
    return toToolResultRecord(content);
  }
  if (content instanceof ThinkingMessageContent) {
    return toThinkingRecord(content);
  }
  if (content instanceof ImageMessageContent) {
    return {
      type: MessageContentType.IMAGE,
      index: content.index,
      contentType: content.contentType,
      altText: content.altText,
    };
  }
  throw new Error('Invalid message content');
}

function toTextRecord(content: TextMessageContent): MessageContentData {
  return {
    type: MessageContentType.TEXT,
    text: content.text,
    ...(content.providerMetadata && {
      providerMetadata: content.providerMetadata,
    }),
    ...(content.isSkillInstruction && { isSkillInstruction: true }),
  };
}

function toToolUseRecord(content: ToolUseMessageContent): MessageContentData {
  return {
    type: MessageContentType.TOOL_USE,
    id: content.id,
    name: content.name,
    params: content.params,
    ...(content.providerMetadata && {
      providerMetadata: content.providerMetadata,
    }),
    ...(content.integration && { integration: content.integration }),
  };
}

function toToolResultRecord(
  content: ToolResultMessageContent,
): MessageContentData {
  return {
    type: MessageContentType.TOOL_RESULT,
    toolId: content.toolId,
    toolName: content.toolName,
    result: content.result,
    ...(content.outcome && { outcome: content.outcome }),
  };
}

function toThinkingRecord(content: ThinkingMessageContent): MessageContentData {
  return {
    type: MessageContentType.THINKING,
    thinking: content.thinking,
    ...(content.id && { id: content.id }),
    ...(content.signature && { signature: content.signature }),
  };
}

function toUserContent(
  content: MessageContentData,
): TextMessageContent | ImageMessageContent {
  if (content.type === MessageContentType.TEXT) {
    return new TextMessageContent(
      content.text,
      null,
      content.isSkillInstruction ?? false,
    );
  }
  if (content.type === MessageContentType.IMAGE) {
    return new ImageMessageContent(
      content.index,
      content.contentType,
      content.altText,
    );
  }
  throw new Error('Invalid message content');
}

function toAssistantContent(
  content: MessageContentData,
): TextMessageContent | ToolUseMessageContent | ThinkingMessageContent {
  if (content.type === MessageContentType.TEXT) {
    return new TextMessageContent(
      content.text,
      content.providerMetadata ?? null,
    );
  }
  if (content.type === MessageContentType.TOOL_USE) {
    return new ToolUseMessageContent(
      content.id,
      content.name,
      content.params,
      content.providerMetadata ?? null,
      content.integration ?? undefined,
    );
  }
  if (content.type === MessageContentType.THINKING) {
    return new ThinkingMessageContent(
      content.thinking,
      content.id ?? null,
      content.signature ?? null,
    );
  }
  throw new Error('Invalid message content');
}

function toToolResultContent(
  content: MessageContentData,
): ToolResultMessageContent {
  if (content.type === MessageContentType.TOOL_RESULT) {
    return new ToolResultMessageContent(
      content.toolId,
      content.toolName,
      content.result,
      content.outcome,
    );
  }
  throw new Error('Invalid message content');
}

function toSystemContent(content: MessageContentData): TextMessageContent {
  if (content.type === MessageContentType.TEXT) {
    return new TextMessageContent(content.text);
  }
  throw new Error('Invalid message content');
}
