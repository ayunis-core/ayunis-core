import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { Message } from 'src/domain/messages/domain/message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import { ModelToolChoice } from '../../domain/value-objects/model-tool-choice.enum';
import { normalizeSchemaForOpenAI } from '../util/normalize-schema-for-openai';

/**
 * Shared message/tool/toolChoice conversion logic for OpenAI Responses API,
 * used by both OpenAIInferenceHandler and OpenAIStreamInferenceHandler.
 */
@Injectable()
export class OpenAIResponsesMessageConverter {
  constructor(private readonly imageContentService: ImageContentService) {}

  convertTool(tool: Tool): OpenAI.Responses.Tool {
    return {
      type: 'function' as const,
      name: tool.name,
      description: tool.description,
      parameters: normalizeSchemaForOpenAI(
        tool.parameters as Record<string, unknown> | undefined,
      ) as Record<string, unknown> | null,
      strict: true,
    };
  }

  async convertMessages(
    messages: Message[],
    orgId: string,
  ): Promise<OpenAI.Responses.ResponseInput> {
    const converted: OpenAI.Responses.ResponseInputItem[] = [];
    for (const message of messages) {
      converted.push(...(await this.convertMessage(message, orgId)));
    }
    return converted;
  }

  // eslint-disable-next-line sonarjs/function-return-type -- returns different types for different tool choices
  convertToolChoice(
    toolChoice: ModelToolChoice,
  ):
    | OpenAI.Responses.ToolChoiceOptions
    | OpenAI.Responses.ToolChoiceTypes
    | OpenAI.Responses.ToolChoiceFunction {
    if (toolChoice === ModelToolChoice.AUTO) return 'auto';
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- toolChoice can be a tool name string at runtime
    if (toolChoice === ModelToolChoice.REQUIRED) return 'required';
    return { type: 'function', name: toolChoice };
  }

  private async convertMessage(
    message: Message,
    orgId: string,
  ): Promise<OpenAI.Responses.ResponseInputItem[]> {
    if (message instanceof UserMessage)
      return this.convertUserMessage(message, orgId);
    if (message instanceof AssistantMessage)
      return this.convertAssistantMessage(message);
    if (message instanceof SystemMessage)
      return this.convertSystemMessage(message);
    if (message instanceof ToolResultMessage)
      return this.convertToolResultMessage(message);
    return [];
  }

  private async convertUserMessage(
    message: UserMessage,
    orgId: string,
  ): Promise<OpenAI.Responses.ResponseInputItem[]> {
    const convertedMessage: OpenAI.Responses.ResponseInputItem.Message = {
      role: 'user' as const,
      content: [],
    };
    for (const content of message.content) {
      if (content instanceof TextMessageContent) {
        convertedMessage.content.push({
          type: 'input_text',
          text: content.text,
        });
      }
      if (content instanceof ImageMessageContent) {
        const imageContent = await this.convertImageContent(content, {
          orgId,
          threadId: message.threadId,
          messageId: message.id,
        });
        convertedMessage.content.push(imageContent);
      }
    }
    return [convertedMessage];
  }

  private convertAssistantMessage(
    message: AssistantMessage,
  ): OpenAI.Responses.ResponseInputItem[] {
    const items: OpenAI.Responses.ResponseInputItem[] = [];
    for (const content of message.content) {
      if (content instanceof ThinkingMessageContent) {
        const item = this.convertThinkingContent(content);
        if (item) items.push(item);
        continue;
      }
      if (content instanceof TextMessageContent) {
        items.push({
          id: 'msg_' + message.id,
          status: 'completed' as const,
          type: 'message',
          role: 'assistant' as const,
          content: [
            {
              type: 'output_text' as const,
              text: content.text,
              annotations: [],
            },
          ],
        });
      }
      if (content instanceof ToolUseMessageContent) {
        items.push({
          id: 'fc_' + content.id,
          call_id: content.id,
          type: 'function_call',
          name: content.name,
          arguments: JSON.stringify(content.params),
        });
      }
    }
    return items;
  }

  private convertThinkingContent(
    content: ThinkingMessageContent,
  ): OpenAI.Responses.ResponseInputItem | null {
    if (!content.id && !content.signature) return null;
    const reasoningItem: Record<string, unknown> = {
      type: 'reasoning',
      id: content.id ?? undefined,
      summary: [{ type: 'summary_text', text: content.thinking }],
    };
    if (content.signature) {
      reasoningItem.encrypted_content = content.signature;
    }
    return reasoningItem as unknown as OpenAI.Responses.ResponseInputItem;
  }

  private convertSystemMessage(
    message: SystemMessage,
  ): OpenAI.Responses.ResponseInputItem[] {
    return [
      {
        role: 'system' as const,
        content: message.content.map((c) => ({
          type: 'input_text' as const,
          text: c.text,
        })),
      },
    ];
  }

  private convertToolResultMessage(
    message: ToolResultMessage,
  ): OpenAI.Responses.ResponseInputItem[] {
    return message.content.map((content) => ({
      id: 'fc_' + message.id,
      status: 'completed' as const,
      type: 'function_call_output' as const,
      call_id: content.toolId,
      output: content.result,
    }));
  }

  private async convertImageContent(
    content: ImageMessageContent,
    context: { orgId: string; threadId: string; messageId: string },
  ): Promise<OpenAI.Responses.ResponseInputImage> {
    const imageData = await this.imageContentService.convertImageToBase64(
      content,
      context,
    );

    const imageUrl = `data:${imageData.contentType};base64,${imageData.base64}`;

    return {
      type: 'input_image',
      image_url: imageUrl,
      detail: 'auto',
    };
  }
}
