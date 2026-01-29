import { Injectable, Logger } from '@nestjs/common';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { Message } from 'src/domain/messages/domain/message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import { ModelToolChoice } from '../../domain/value-objects/model-tool-choice.enum';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import type {
  Content,
  Part,
  FunctionDeclaration,
  FunctionCallingConfig,
} from '@google/genai';
import { FunctionCallingConfigMode } from '@google/genai';

@Injectable()
export class GeminiConversionService {
  private readonly logger = new Logger(GeminiConversionService.name);

  constructor(private readonly imageContentService: ImageContentService) {}

  convertTool = (tool: Tool): FunctionDeclaration => {
    return {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as FunctionDeclaration['parameters'],
    };
  };

  convertToolChoice = (toolChoice: ModelToolChoice): FunctionCallingConfig => {
    if (toolChoice === ModelToolChoice.AUTO) {
      return { mode: FunctionCallingConfigMode.AUTO };
    } else if (toolChoice === ModelToolChoice.REQUIRED) {
      return { mode: FunctionCallingConfigMode.ANY };
    } else {
      return {
        mode: FunctionCallingConfigMode.ANY,
        allowedFunctionNames: [toolChoice],
      };
    }
  };

  convertMessages = async (
    messages: Message[],
    orgId: string,
  ): Promise<Content[]> => {
    const contents: Content[] = [];

    for (const message of messages) {
      const content = await this.convertMessage(message, orgId);
      if (content) {
        contents.push(content);
      }
    }

    return contents;
  };

  convertMessage = async (
    message: Message,
    orgId: string,
  ): Promise<Content | null> => {
    if (message instanceof UserMessage) {
      const parts: Part[] = [];
      for (const content of message.content) {
        if (content instanceof TextMessageContent) {
          parts.push({ text: content.text });
        }
        if (content instanceof ImageMessageContent) {
          const imageData = await this.imageContentService.convertImageToBase64(
            content,
            {
              orgId,
              threadId: message.threadId,
              messageId: message.id,
            },
          );
          parts.push({
            inlineData: {
              mimeType: imageData.contentType,
              data: imageData.base64,
            },
          });
        }
      }
      return { role: 'user', parts };
    }

    if (message instanceof AssistantMessage) {
      const parts: Part[] = [];
      for (const content of message.content) {
        if (content instanceof TextMessageContent) {
          parts.push({ text: content.text });
        }
        if (content instanceof ToolUseMessageContent) {
          parts.push({
            functionCall: {
              id: content.id,
              name: content.name,
              args: content.params as Record<string, unknown>,
            },
          });
        }
      }
      return { role: 'model', parts };
    }

    if (message instanceof ToolResultMessage) {
      const parts: Part[] = [];
      for (const content of message.content) {
        parts.push({
          functionResponse: {
            id: content.toolId,
            name: content.toolName,
            response: { result: content.result },
          },
        });
      }
      return { role: 'user', parts };
    }

    if (message instanceof SystemMessage) {
      return {
        role: 'user',
        parts: message.content.map((content) => ({
          text: content.text,
        })),
      };
    }

    this.logger.warn('Unknown message type', message);
    return null;
  };
}
