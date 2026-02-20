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
import type {
  Content,
  Part,
  FunctionDeclaration,
  FunctionCallingConfig,
  GenerateContentConfig,
} from '@google/genai';
import { FunctionCallingConfigMode } from '@google/genai';

/**
 * Extends the SDK's Part type with `thoughtSignature`, which Gemini returns
 * on thinking-model responses but isn't yet in the official type definitions.
 */
export interface GeminiPart extends Part {
  thoughtSignature?: string;
}

/**
 * Shared message/tool/toolChoice conversion logic for Gemini,
 * used by both GeminiInferenceHandler and GeminiStreamInferenceHandler.
 */
@Injectable()
export class GeminiMessageConverter {
  constructor(private readonly imageContentService: ImageContentService) {}

  convertTool(tool: Tool): FunctionDeclaration {
    return {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as FunctionDeclaration['parameters'],
    };
  }

  convertToolChoice(toolChoice: ModelToolChoice): FunctionCallingConfig {
    if (toolChoice === ModelToolChoice.AUTO) {
      return { mode: FunctionCallingConfigMode.AUTO };
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- toolChoice can be a tool name string at runtime
    if (toolChoice === ModelToolChoice.REQUIRED) {
      return { mode: FunctionCallingConfigMode.ANY };
    }
    return {
      mode: FunctionCallingConfigMode.ANY,
      allowedFunctionNames: [toolChoice],
    };
  }

  buildConfig(input: {
    systemPrompt?: string;
    tools: Tool[];
    toolChoice?: ModelToolChoice;
  }): GenerateContentConfig {
    const { tools, toolChoice, systemPrompt } = input;
    const geminiTools = tools.length
      ? [{ functionDeclarations: tools.map((t) => this.convertTool(t)) }]
      : undefined;

    return {
      systemInstruction: systemPrompt
        ? { role: 'user', parts: [{ text: systemPrompt }] }
        : undefined,
      tools: geminiTools,
      toolConfig:
        toolChoice && tools.length
          ? { functionCallingConfig: this.convertToolChoice(toolChoice) }
          : undefined,
    };
  }

  async convertMessages(
    messages: Message[],
    orgId: string,
  ): Promise<Content[]> {
    const contents: Content[] = [];
    for (const message of messages) {
      const content = await this.convertMessage(message, orgId);
      if (content) contents.push(content);
    }
    return contents;
  }

  extractProviderMetadata(
    part: Part,
  ): { gemini: { thoughtSignature: string } } | null {
    const sig = (part as GeminiPart).thoughtSignature;
    return sig ? { gemini: { thoughtSignature: sig } } : null;
  }

  private async convertMessage(
    message: Message,
    orgId: string,
  ): Promise<Content | null> {
    if (message instanceof UserMessage)
      return this.convertUserMessage(message, orgId);
    if (message instanceof AssistantMessage)
      return this.convertAssistantMessage(message);
    if (message instanceof ToolResultMessage)
      return this.convertToolResultMessage(message);
    if (message instanceof SystemMessage)
      return {
        role: 'user',
        parts: message.content.map((c) => ({ text: c.text })),
      };
    return null;
  }

  private async convertUserMessage(
    message: UserMessage,
    orgId: string,
  ): Promise<Content> {
    const parts: Part[] = [];
    for (const content of message.content) {
      if (content instanceof TextMessageContent) {
        parts.push({ text: content.text });
      }
      if (content instanceof ImageMessageContent) {
        const imageData = await this.imageContentService.convertImageToBase64(
          content,
          { orgId, threadId: message.threadId, messageId: message.id },
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

  private convertAssistantMessage(message: AssistantMessage): Content {
    const parts: Part[] = [];
    for (const content of message.content) {
      if (content instanceof TextMessageContent) {
        const textPart: GeminiPart = { text: content.text };
        if (content.providerMetadata?.gemini?.thoughtSignature) {
          textPart.thoughtSignature =
            content.providerMetadata.gemini.thoughtSignature;
        }
        parts.push(textPart);
      }
      if (content instanceof ToolUseMessageContent) {
        const fcPart: GeminiPart = {
          functionCall: {
            id: content.id,
            name: content.name,
            args: content.params,
          },
        };
        if (content.providerMetadata?.gemini?.thoughtSignature) {
          fcPart.thoughtSignature =
            content.providerMetadata.gemini.thoughtSignature;
        }
        parts.push(fcPart);
      }
    }
    return { role: 'model', parts };
  }

  private convertToolResultMessage(message: ToolResultMessage): Content {
    const parts: Part[] = message.content.map((c) => ({
      functionResponse: {
        id: c.toolId,
        name: c.toolName,
        response: { result: c.result },
      },
    }));
    return { role: 'user', parts };
  }
}
