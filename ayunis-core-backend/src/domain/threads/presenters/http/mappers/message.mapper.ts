import { Injectable } from '@nestjs/common';
import { Message } from 'src/domain/messages/domain/message.entity';
import { MessageContent } from 'src/domain/messages/domain/message-content.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import {
  UserMessageResponseDto,
  SystemMessageResponseDto,
  AssistantMessageResponseDto,
  ToolResultMessageResponseDto,
  TextMessageContentResponseDto,
  ToolUseMessageContentResponseDto,
  ToolResultMessageContentResponseDto,
} from '../dto/message-response.dto';

@Injectable()
export class MessageDtoMapper {
  toDto(
    message: Message,
  ):
    | UserMessageResponseDto
    | SystemMessageResponseDto
    | AssistantMessageResponseDto
    | ToolResultMessageResponseDto {
    const baseProps = {
      id: message.id,
      threadId: message.threadId,
      createdAt: message.createdAt.toISOString(),
    };

    switch (message.role) {
      case MessageRole.USER:
        return {
          ...baseProps,
          role: MessageRole.USER,
          content: this.mapTextContentArray(
            message.content as TextMessageContent[],
          ),
        };

      case MessageRole.SYSTEM:
        return {
          ...baseProps,
          role: MessageRole.SYSTEM,
          content: this.mapTextContentArray(
            message.content as TextMessageContent[],
          ),
        };

      case MessageRole.ASSISTANT:
        return {
          ...baseProps,
          role: MessageRole.ASSISTANT,
          content: this.mapAssistantContentArray(
            message.content as Array<
              TextMessageContent | ToolUseMessageContent
            >,
          ),
        };

      case MessageRole.TOOL:
        return {
          ...baseProps,
          role: MessageRole.TOOL,
          content: this.mapToolResultContentArray(
            message.content as ToolResultMessageContent[],
          ),
        };

      default:
        throw new Error(`Unknown message role: ${message.role}`);
    }
  }

  toDtoArray(
    messages: Message[],
  ): Array<
    | UserMessageResponseDto
    | SystemMessageResponseDto
    | AssistantMessageResponseDto
    | ToolResultMessageResponseDto
  > {
    return messages.map((message) => this.toDto(message));
  }

  private mapTextContentArray(
    content: TextMessageContent[],
  ): TextMessageContentResponseDto[] {
    return content.map((contentItem) => this.mapTextContent(contentItem));
  }

  private mapAssistantContentArray(
    content: Array<TextMessageContent | ToolUseMessageContent>,
  ): Array<TextMessageContentResponseDto | ToolUseMessageContentResponseDto> {
    return content.map((contentItem) => {
      if (contentItem.type === MessageContentType.TEXT) {
        return this.mapTextContent(contentItem as TextMessageContent);
      } else if (contentItem.type === MessageContentType.TOOL_USE) {
        return this.mapToolUseContent(contentItem as ToolUseMessageContent);
      } else {
        throw new Error(
          `Invalid content type for assistant message: ${contentItem.type}`,
        );
      }
    });
  }

  private mapToolResultContentArray(
    content: ToolResultMessageContent[],
  ): ToolResultMessageContentResponseDto[] {
    return content.map((contentItem) => this.mapToolResultContent(contentItem));
  }

  private mapTextContent(
    content: TextMessageContent,
  ): TextMessageContentResponseDto {
    return {
      type: content.type,
      text: content.text,
    };
  }

  private mapToolUseContent(
    content: ToolUseMessageContent,
  ): ToolUseMessageContentResponseDto {
    return {
      type: content.type,
      id: content.id,
      name: content.name,
      params: content.params,
    };
  }

  private mapToolResultContent(
    content: ToolResultMessageContent,
  ): ToolResultMessageContentResponseDto {
    return {
      type: content.type,
      toolId: content.toolId,
      toolName: content.toolName,
      result: content.result,
    };
  }
}
