import { Injectable } from '@nestjs/common';
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
import { ModelToolChoice } from '../../domain/value-objects/model-tool-choice.enum';
import {
  ToolCall as MistralToolCall,
  Tool as MistralTool,
  Messages as MistralMessages,
  ToolChoiceEnum as MistralToolChoiceEnum,
  ToolChoice as MistralToolChoice,
} from '@mistralai/mistralai/models/components';

/**
 * Shared message/tool/toolChoice conversion logic for Mistral,
 * used by both MistralInferenceHandler and MistralStreamInferenceHandler.
 */
@Injectable()
export class MistralMessageConverter {
  constructor(private readonly imageContentService: ImageContentService) {}

  convertTool(tool: Tool): MistralTool {
    return {
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as Record<string, unknown>,
      },
    };
  }

  convertSystemPrompt(systemPrompt: string): MistralMessages {
    return { role: 'system' as const, content: systemPrompt };
  }

  // eslint-disable-next-line sonarjs/function-return-type -- returns different types for different tool choices
  convertToolChoice(
    toolChoice: ModelToolChoice,
  ): MistralToolChoice | MistralToolChoiceEnum {
    if (toolChoice === ModelToolChoice.AUTO) return 'auto';
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- toolChoice can be a tool name string at runtime
    if (toolChoice === ModelToolChoice.REQUIRED) return 'required';
    return { type: 'function', function: { name: toolChoice } };
  }

  async convertMessages(
    messages: Message[],
    orgId: string,
  ): Promise<MistralMessages[]> {
    const converted: MistralMessages[] = [];
    for (const message of messages) {
      converted.push(...(await this.convertMessage(message, orgId)));
    }
    return converted;
  }

  async convertImageContent(
    content: ImageMessageContent,
    context: { orgId: string; threadId: string; messageId: string },
  ): Promise<string> {
    const imageData = await this.imageContentService.convertImageToBase64(
      content,
      context,
    );
    return `data:${imageData.contentType};base64,${imageData.base64}`;
  }

  private async convertMessage(
    message: Message,
    orgId: string,
  ): Promise<MistralMessages[]> {
    if (message instanceof UserMessage)
      return this.convertUserMessage(message, orgId);
    if (message instanceof AssistantMessage)
      return [this.convertAssistantMessage(message)];
    if (message instanceof SystemMessage)
      return this.convertSystemMessage(message);
    if (message instanceof ToolResultMessage)
      return this.convertToolResultMessage(message);
    return [];
  }

  private async convertUserMessage(
    message: UserMessage,
    orgId: string,
  ): Promise<MistralMessages[]> {
    const contentItems: Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; imageUrl: { url: string } }
    > = [];
    for (const content of message.content) {
      if (content instanceof TextMessageContent) {
        contentItems.push({ type: 'text' as const, text: content.text });
      }
      if (content instanceof ImageMessageContent) {
        const imageUrl = await this.convertImageContent(content, {
          orgId,
          threadId: message.threadId,
          messageId: message.id,
        });
        contentItems.push({
          type: 'image_url' as const,
          imageUrl: { url: imageUrl },
        });
      }
    }
    return contentItems.length > 0
      ? [{ role: 'user' as const, content: contentItems }]
      : [];
  }

  private convertAssistantMessage(message: AssistantMessage): MistralMessages {
    let text: string | undefined;
    const toolCalls: MistralToolCall[] = [];
    for (const content of message.content) {
      if (content instanceof TextMessageContent) text = content.text;
      if (content instanceof ToolUseMessageContent) {
        toolCalls.push({
          id: content.id,
          type: 'function',
          function: { name: content.name, arguments: content.params },
        });
      }
    }
    return {
      role: 'assistant' as const,
      content: text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }

  private convertSystemMessage(message: SystemMessage): MistralMessages[] {
    return message.content.map((c) => ({
      role: 'system' as const,
      content: c.text,
    }));
  }

  private convertToolResultMessage(
    message: ToolResultMessage,
  ): MistralMessages[] {
    const results: MistralMessages[] = [];
    let allDisplayed = true;
    for (const c of message.content) {
      results.push({
        role: 'tool' as const,
        toolCallId: c.toolId,
        content: c.result,
      });
      if (c.result !== 'Tool has been displayed successfully')
        allDisplayed = false;
    }
    if (allDisplayed && message.content.length > 0) {
      results.push({
        role: 'assistant' as const,
        content: 'Awaiting user input',
      });
    }
    return results;
  }
}
