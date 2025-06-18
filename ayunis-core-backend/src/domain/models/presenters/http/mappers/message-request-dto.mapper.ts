import { Injectable } from '@nestjs/common';
import { UUID, randomUUID } from 'crypto';
import { Message } from 'src/domain/messages/domain/message.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import {
  MessageRequestDto,
  UserMessageRequestDto,
  SystemMessageRequestDto,
  AssistantMessageRequestDto,
  ToolResultMessageRequestDto,
  TextMessageContentRequestDto,
  ToolUseMessageContentRequestDto,
  ToolResultMessageContentRequestDto,
} from '../dto/inference-request.dto';

@Injectable()
export class MessageRequestDtoMapper {
  fromDto(
    messageDto: MessageRequestDto,
    threadId: UUID = randomUUID(),
  ): Message {
    switch ((messageDto as any).role) {
      case MessageRole.USER:
        return this.fromUserMessageDto(
          messageDto as UserMessageRequestDto,
          threadId,
        );
      case MessageRole.SYSTEM:
        return this.fromSystemMessageDto(
          messageDto as SystemMessageRequestDto,
          threadId,
        );
      case MessageRole.ASSISTANT:
        return this.fromAssistantMessageDto(
          messageDto as AssistantMessageRequestDto,
          threadId,
        );
      case MessageRole.TOOL:
        return this.fromToolResultMessageDto(
          messageDto as ToolResultMessageRequestDto,
          threadId,
        );
      default:
        throw new Error(`Unknown message role: ${messageDto.role}`);
    }
  }

  fromDtoArray(
    messageDtos: MessageRequestDto[],
    threadId: UUID = randomUUID(),
  ): Message[] {
    return messageDtos.map((dto) => this.fromDto(dto, threadId));
  }

  private fromUserMessageDto(
    dto: UserMessageRequestDto,
    threadId: UUID,
  ): UserMessage {
    return new UserMessage({
      threadId,
      content: dto.content.map((content) => this.fromTextContentDto(content)),
    });
  }

  private fromSystemMessageDto(
    dto: SystemMessageRequestDto,
    threadId: UUID,
  ): SystemMessage {
    return new SystemMessage({
      threadId,
      content: dto.content.map((content) => this.fromTextContentDto(content)),
    });
  }

  private fromAssistantMessageDto(
    dto: AssistantMessageRequestDto,
    threadId: UUID,
  ): AssistantMessage {
    return new AssistantMessage({
      threadId,
      content: dto.content.map((content) => {
        if ((content as any).type === MessageContentType.TEXT) {
          return this.fromTextContentDto(
            content as TextMessageContentRequestDto,
          );
        } else if ((content as any).type === MessageContentType.TOOL_USE) {
          return this.fromToolUseContentDto(
            content as ToolUseMessageContentRequestDto,
          );
        } else {
          throw new Error(
            `Invalid content type for assistant message: ${(content as any).type}`,
          );
        }
      }),
    });
  }

  private fromToolResultMessageDto(
    dto: ToolResultMessageRequestDto,
    threadId: UUID,
  ): ToolResultMessage {
    return new ToolResultMessage({
      threadId,
      content: dto.content.map((content) =>
        this.fromToolResultContentDto(content),
      ),
    });
  }

  private fromTextContentDto(
    dto: TextMessageContentRequestDto,
  ): TextMessageContent {
    return new TextMessageContent(dto.text);
  }

  private fromToolUseContentDto(
    dto: ToolUseMessageContentRequestDto,
  ): ToolUseMessageContent {
    return new ToolUseMessageContent(dto.id, dto.name, dto.params);
  }

  private fromToolResultContentDto(
    dto: ToolResultMessageContentRequestDto,
  ): ToolResultMessageContent {
    return new ToolResultMessageContent(dto.toolId, dto.toolName, dto.result);
  }
}
