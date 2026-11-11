import { Injectable } from '@nestjs/common';
import { Message } from 'src/domain/messages/domain/message.entity';
import { MessageRecord } from 'src/domain/messages/infrastructure/persistence/local/schema/message.record';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import type { MessageContent } from 'src/domain/messages/domain/message-content.entity';

type MessageContentData = MessageRecord['content'][number];

const INVALID_CONTENT = 'Invalid message content';

@Injectable()
export class MessageMapper {
  toRecord(message: Message): MessageRecord {
    const record = new MessageRecord();
    record.id = message.id;
    record.threadId = message.threadId;
    record.role = message.role;
    record.createdAt = message.createdAt;
    record.content = message.content.map((content) => contentToRecord(content));
    return record;
  }

  toDomain(messageEntity: MessageRecord): Message {
    const base = {
      id: messageEntity.id,
      threadId: messageEntity.threadId,
      createdAt: messageEntity.createdAt,
    };
    const content = messageEntity.content;
    switch (messageEntity.role) {
      case MessageRole.USER:
        return new UserMessage({
          ...base,
          content: content.map((item) => userContentToDomain(item)),
        });
      case MessageRole.ASSISTANT:
        return new AssistantMessage({
          ...base,
          content: content.map((item) => assistantContentToDomain(item)),
        });
      case MessageRole.TOOL:
        return new ToolResultMessage({
          ...base,
          content: content.map((item) => toolContentToDomain(item)),
        });
      case MessageRole.SYSTEM:
        return new SystemMessage({
          ...base,
          content: content.map((item) => systemContentToDomain(item)),
        });
      default:
        throw new Error('Invalid message role');
    }
  }
}

function contentToRecord(content: MessageContent): MessageContentData {
  if (content instanceof TextMessageContent) {
    return textToRecord(content);
  }
  if (content instanceof ToolUseMessageContent) {
    return toolUseToRecord(content);
  }
  if (content instanceof ToolResultMessageContent) {
    return {
      type: MessageContentType.TOOL_RESULT,
      toolId: content.toolId,
      toolName: content.toolName,
      result: content.result,
      ...(content.decision && { decision: content.decision }),
    };
  }
  if (content instanceof ThinkingMessageContent) {
    return {
      type: MessageContentType.THINKING,
      thinking: content.thinking,
      ...(content.id && { id: content.id }),
      ...(content.signature && { signature: content.signature }),
    };
  }
  if (content instanceof ImageMessageContent) {
    return {
      type: MessageContentType.IMAGE,
      index: content.index,
      contentType: content.contentType,
      altText: content.altText,
    };
  }
  throw new Error(INVALID_CONTENT);
}

function textToRecord(content: TextMessageContent): MessageContentData {
  return {
    type: MessageContentType.TEXT,
    text: content.text,
    ...(content.providerMetadata && {
      providerMetadata: content.providerMetadata,
    }),
    ...(content.isSkillInstruction && {
      isSkillInstruction: true,
    }),
    ...(content.isNudge && { isNudge: true }),
  };
}

function toolUseToRecord(content: ToolUseMessageContent): MessageContentData {
  return {
    type: MessageContentType.TOOL_USE,
    id: content.id,
    name: content.name,
    params: content.params,
    ...(content.providerMetadata && {
      providerMetadata: content.providerMetadata,
    }),
    ...(content.integration && {
      integration: content.integration,
    }),
    ...(content.requiresConfirmation && { requiresConfirmation: true }),
  };
}

function userContentToDomain(
  content: MessageContentData,
): TextMessageContent | ImageMessageContent {
  if (content.type === MessageContentType.TEXT) {
    return new TextMessageContent(
      content.text,
      null,
      content.isSkillInstruction ?? false,
      content.isNudge ?? false,
    );
  }
  if (content.type === MessageContentType.IMAGE) {
    return new ImageMessageContent(
      content.index,
      content.contentType,
      content.altText,
    );
  }
  throw new Error(INVALID_CONTENT);
}

function assistantContentToDomain(
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
      undefined,
      content.requiresConfirmation ?? false,
    );
  }
  if (content.type === MessageContentType.THINKING) {
    return new ThinkingMessageContent(
      content.thinking,
      content.id ?? null,
      content.signature ?? null,
    );
  }
  throw new Error(INVALID_CONTENT);
}

function toolContentToDomain(
  content: MessageContentData,
): ToolResultMessageContent {
  if (content.type === MessageContentType.TOOL_RESULT) {
    return new ToolResultMessageContent(
      content.toolId,
      content.toolName,
      content.result,
      content.decision,
    );
  }
  throw new Error(INVALID_CONTENT);
}

function systemContentToDomain(
  content: MessageContentData,
): TextMessageContent {
  if (content.type === MessageContentType.TEXT) {
    return new TextMessageContent(content.text);
  }
  throw new Error(INVALID_CONTENT);
}
