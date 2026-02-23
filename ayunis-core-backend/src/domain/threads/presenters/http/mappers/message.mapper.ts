import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Message } from 'src/domain/messages/domain/message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
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
  ThinkingMessageContentResponseDto,
} from '../dto/get-thread-response.dto/message-response.dto';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { ImageMessageContentResponseDto } from '../dto/get-thread-response.dto/message-response.dto';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class MessageDtoMapper {
  constructor(private readonly contextService: ContextService) {}

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
          content: this.mapUserContentArray(
            message.content as Array<TextMessageContent | ImageMessageContent>,
            message.threadId,
            message.id,
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
              | TextMessageContent
              | ToolUseMessageContent
              | ThinkingMessageContent
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
        throw new Error('Unknown message role');
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
    content: Array<
      TextMessageContent | ToolUseMessageContent | ThinkingMessageContent
    >,
  ): Array<
    | TextMessageContentResponseDto
    | ToolUseMessageContentResponseDto
    | ThinkingMessageContentResponseDto
  > {
    return content.map((contentItem) => {
      if (contentItem.type === MessageContentType.TEXT) {
        return this.mapTextContent(contentItem as TextMessageContent);
      } else if (contentItem.type === MessageContentType.TOOL_USE) {
        return this.mapToolUseContent(contentItem as ToolUseMessageContent);
      } else if (contentItem.type === MessageContentType.THINKING) {
        return this.mapThinkingContent(contentItem as ThinkingMessageContent);
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

  private mapThinkingContent(
    content: ThinkingMessageContent,
  ): ThinkingMessageContentResponseDto {
    return {
      type: content.type,
      thinking: content.thinking,
    };
  }

  private mapUserContentArray(
    content: Array<TextMessageContent | ImageMessageContent>,
    threadId: string,
    messageId: string,
  ): Array<TextMessageContentResponseDto | ImageMessageContentResponseDto> {
    return content.map((contentItem) => {
      if (contentItem.type === MessageContentType.TEXT) {
        return this.mapTextContent(contentItem as TextMessageContent);
      }
      if (contentItem.type === MessageContentType.IMAGE) {
        return this.mapImageContent(
          contentItem as ImageMessageContent,
          threadId,
          messageId,
        );
      }
      throw new Error(
        `Invalid content type for user message: ${contentItem.type}`,
      );
    });
  }

  private mapTextContent(
    content: TextMessageContent,
  ): TextMessageContentResponseDto {
    return {
      type: content.type,
      text: content.text,
      ...(content.isSkillInstruction && { isSkillInstruction: true }),
    };
  }

  private mapImageContent(
    content: ImageMessageContent,
    threadId: string,
    messageId: string,
  ): ImageMessageContentResponseDto {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('Organization context required');
    }

    // Compute the storage path and return it as imageUrl for frontend to fetch
    const storagePath = content.getStoragePath(orgId, threadId, messageId);

    return {
      type: content.type,
      imageUrl: storagePath,
      altText: content.altText,
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
