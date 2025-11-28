import { Injectable } from '@nestjs/common';
import { Message } from 'src/domain/messages/domain/message.entity';
import { MessageRecord } from '../schema/message.record';
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

@Injectable()
export class MessageMapper {
  toRecord(message: Message): MessageRecord {
    const record = new MessageRecord();
    record.id = message.id;
    record.threadId = message.threadId;
    record.role = message.role;
    record.createdAt = message.createdAt;
    record.content = message.content.map((content) => {
      if (content instanceof TextMessageContent) {
        return {
          type: MessageContentType.TEXT,
          text: content.text,
        };
      }
      if (content instanceof ToolUseMessageContent) {
        return {
          type: MessageContentType.TOOL_USE,
          id: content.id,
          name: content.name,
          params: content.params,
        };
      }
      if (content instanceof ToolResultMessageContent) {
        return {
          type: MessageContentType.TOOL_RESULT,
          toolId: content.toolId,
          toolName: content.toolName,
          result: content.result,
        };
      }
      if (content instanceof ThinkingMessageContent) {
        return {
          type: MessageContentType.THINKING,
          thinking: content.thinking,
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
      throw new Error('Invalid message content');
    });
    return record;
  }

  toDomain(messageEntity: MessageRecord): Message {
    switch (messageEntity.role) {
      case MessageRole.USER:
        return new UserMessage({
          threadId: messageEntity.threadId,
          createdAt: messageEntity.createdAt,
          content: messageEntity.content.map((content) => {
            if (content.type === MessageContentType.TEXT) {
              return new TextMessageContent(content.text);
            }
            if (content.type === MessageContentType.IMAGE) {
              return new ImageMessageContent(
                content.index,
                content.contentType,
                content.altText,
              );
            }
            throw new Error('Invalid message content');
          }),
        });
      case MessageRole.ASSISTANT:
        return new AssistantMessage({
          threadId: messageEntity.threadId,
          createdAt: messageEntity.createdAt,
          content: messageEntity.content.map((content) => {
            if (content.type === MessageContentType.TEXT) {
              return new TextMessageContent(content.text);
            }
            if (content.type === MessageContentType.TOOL_USE) {
              return new ToolUseMessageContent(
                content.id,
                content.name,
                content.params,
              );
            }
            if (content.type === MessageContentType.THINKING) {
              return new ThinkingMessageContent(content.thinking);
            }
            throw new Error('Invalid message content');
          }),
        });
      case MessageRole.TOOL:
        return new ToolResultMessage({
          threadId: messageEntity.threadId,
          createdAt: messageEntity.createdAt,
          content: messageEntity.content.map((content) => {
            if (content.type === MessageContentType.TOOL_RESULT) {
              return new ToolResultMessageContent(
                content.toolId,
                content.toolName,
                content.result,
              );
            }
            throw new Error('Invalid message content');
          }),
        });
      case MessageRole.SYSTEM:
        return new SystemMessage({
          threadId: messageEntity.threadId,
          createdAt: messageEntity.createdAt,
          content: messageEntity.content.map((content) => {
            if (content.type === MessageContentType.TEXT) {
              return new TextMessageContent(content.text);
            }
            throw new Error('Invalid message content');
          }),
        });
      default:
        throw new Error('Invalid message role');
    }
  }
}
