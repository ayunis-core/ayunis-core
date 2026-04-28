import type OpenAI from 'openai';
import type { FunctionParameters } from 'openai/resources/shared';
import type { ToolSchema } from 'src/domain/tools/domain/tool.entity';
import type { Message } from 'src/domain/messages/domain/message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { ModelToolChoice } from '../../domain/value-objects/model-tool-choice.enum';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { normalizeSchemaForOpenAI } from '../util/normalize-schema-for-openai';

/**
 * Shared message/tool/toolChoice conversion logic for OpenAI Chat Completions API,
 * used by both BaseOpenAIChatInferenceHandler and BaseOpenAIChatStreamInferenceHandler.
 */
export class OpenAIChatMessageConverter {
  constructor(private readonly imageContentService: ImageContentService) {}

  convertTool(tool: ToolSchema): OpenAI.ChatCompletionTool {
    return {
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: normalizeSchemaForOpenAI(
          tool.parameters as Record<string, unknown> | undefined,
        ) as FunctionParameters | undefined,
      },
    };
  }

  convertSystemPrompt(systemPrompt: string): OpenAI.ChatCompletionMessageParam {
    return { role: 'system' as const, content: systemPrompt };
  }

  async convertMessages(
    messages: Message[],
    orgId: string,
  ): Promise<OpenAI.ChatCompletionMessageParam[]> {
    const converted: OpenAI.ChatCompletionMessageParam[] = [];
    for (const message of messages) {
      converted.push(...(await this.convertMessage(message, orgId)));
    }
    return converted;
  }

  // eslint-disable-next-line sonarjs/function-return-type -- returns different types for different tool choices
  convertToolChoice(
    toolChoice: ModelToolChoice,
  ): OpenAI.ChatCompletionToolChoiceOption {
    if (toolChoice === ModelToolChoice.AUTO) return 'auto';
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- toolChoice can be a tool name string at runtime
    if (toolChoice === ModelToolChoice.REQUIRED) return 'required';
    return { type: 'function', function: { name: toolChoice } };
  }

  private async convertMessage(
    message: Message,
    orgId: string,
  ): Promise<OpenAI.ChatCompletionMessageParam[]> {
    if (message.role === MessageRole.USER)
      return this.convertUserMessage(message, orgId);
    if (message.role === MessageRole.ASSISTANT)
      return [this.convertAssistantMessage(message)];
    if (message.role === MessageRole.SYSTEM)
      return this.convertSystemMessage(message);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- guard for runtime safety
    if (message.role === MessageRole.TOOL)
      return this.convertToolMessage(message);
    return [];
  }

  private async convertUserMessage(
    message: Message,
    orgId: string,
  ): Promise<OpenAI.ChatCompletionMessageParam[]> {
    const contentParts: OpenAI.ChatCompletionContentPart[] = [];
    for (const content of message.content) {
      if (content instanceof TextMessageContent) {
        contentParts.push({ type: 'text' as const, text: content.text });
      } else if (content instanceof ImageMessageContent) {
        contentParts.push(
          await this.convertImageContent(content, {
            orgId,
            threadId: message.threadId,
            messageId: message.id,
          }),
        );
      }
    }

    if (contentParts.length === 0) return [];

    return [{ role: 'user' as const, content: contentParts }];
  }

  private async convertImageContent(
    content: ImageMessageContent,
    context: { orgId: string; threadId: string; messageId: string },
  ): Promise<OpenAI.ChatCompletionContentPartImage> {
    const imageData = await this.imageContentService.convertImageToBase64(
      content,
      context,
    );
    return {
      type: 'image_url' as const,
      image_url: {
        url: `data:${imageData.contentType};base64,${imageData.base64}`,
      },
    };
  }

  private convertAssistantMessage(
    message: Message,
  ): OpenAI.ChatCompletionMessageParam {
    let text: string | undefined;
    const toolCalls: OpenAI.ChatCompletionMessageToolCall[] = [];
    for (const content of message.content) {
      if (content instanceof TextMessageContent) text = content.text;
      if (content instanceof ToolUseMessageContent) {
        toolCalls.push({
          id: content.id,
          type: 'function',
          function: {
            name: content.name,
            arguments: JSON.stringify(content.params),
          },
        });
      }
    }
    return {
      role: 'assistant' as const,
      content: text,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }

  private convertSystemMessage(
    message: Message,
  ): OpenAI.ChatCompletionMessageParam[] {
    return message.content
      .filter((c) => c instanceof TextMessageContent)
      .map((c) => ({ role: 'system' as const, content: c.text }));
  }

  private convertToolMessage(
    message: Message,
  ): OpenAI.ChatCompletionMessageParam[] {
    return message.content
      .filter((c) => c instanceof ToolResultMessageContent)
      .map((c) => ({
        role: 'tool' as const,
        tool_call_id: c.toolId,
        content: c.result,
      }));
  }
}
