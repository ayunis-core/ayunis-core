import { Logger } from '@nestjs/common';
import { TextMessageContent } from '../../../messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from '../../../messages/domain/message-contents/tool-use.message-content.entity';
import { Tool as ToolEntity } from '../../../tools/domain/tool.entity';
import { Message } from '../../../messages/domain/message.entity';
import { UserMessage } from '../../../messages/domain/messages/user-message.entity';
import { AssistantMessage } from '../../../messages/domain/messages/assistant-message.entity';
import { SystemMessage } from '../../../messages/domain/messages/system-message.entity';
import { ToolResultMessage } from '../../../messages/domain/messages/tool-result-message.entity';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { Mistral } from '@mistralai/mistralai';
import {
  ToolCall as MistralToolCall,
  Tool as MistralTool,
  Messages as MistralMessages,
  ToolChoiceEnum as MistralToolChoiceEnum,
  ToolChoice as MistralToolChoice,
} from '@mistralai/mistralai/models/components';
import { ChatCompletionResponse } from '@mistralai/mistralai/models/components';
import { Injectable } from '@nestjs/common';
import {
  InferenceHandler,
  InferenceResponse,
  InferenceInput as HandlerInferenceInput,
} from '../../application/ports/inference.handler';
import { ModelToolChoice } from '../../domain/value-objects/model-tool-choice.enum';
import { ConfigService } from '@nestjs/config';
import { InferenceFailedError } from 'src/domain/models/application/models.errors';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';

@Injectable()
export class MistralInferenceHandler extends InferenceHandler {
  private readonly logger = new Logger(MistralInferenceHandler.name);
  private readonly client: Mistral;

  constructor(
    private readonly configService: ConfigService,
    private readonly imageContentService: ImageContentService,
  ) {
    super();
    this.client = new Mistral({
      apiKey: this.configService.get('mistral.apiKey'),
    });
  }

  async answer(input: HandlerInferenceInput): Promise<InferenceResponse> {
    this.logger.log('answer', {
      model: input.model.name,
      messageCount: input.messages.length,
      toolCount: input.tools?.length ?? 0,
      toolChoice: input.toolChoice,
    });
    const { model, messages, tools, toolChoice, orgId } = input;
    const mistralTools = tools?.map(this.convertTool);
    const mistralMessages = await this.convertMessages(messages, orgId);
    const systemPrompt = input.systemPrompt
      ? this.convertSystemPrompt(input.systemPrompt)
      : undefined;
    const mistralToolChoice = toolChoice
      ? this.convertToolChoice(toolChoice)
      : undefined;

    const completionFn = () =>
      this.client.chat.complete({
        model: model.name,
        messages: systemPrompt
          ? [systemPrompt, ...mistralMessages]
          : mistralMessages,
        tools: mistralTools,
        toolChoice: mistralToolChoice,
        maxTokens: 1000,
      });

    const response = await retryWithBackoff({
      fn: completionFn,
      maxRetries: 3,
      delay: 1000,
    });

    const modelResponse = this.parseCompletion(response);
    return modelResponse;
  }

  private convertTool = (tool: ToolEntity): MistralTool => {
    return {
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as Record<string, any>,
      },
    };
  };

  private convertSystemPrompt = (systemPrompt: string): MistralMessages => {
    return {
      role: 'system' as const,
      content: systemPrompt,
    };
  };

  private convertMessages = async (
    messages: Message[],
    orgId: string,
  ): Promise<MistralMessages[]> => {
    const convertedMessages: MistralMessages[] = [];
    for (const message of messages) {
      convertedMessages.push(...(await this.convertMessage(message, orgId)));
    }
    return convertedMessages;
  };

  private convertMessage = async (
    message: Message,
    orgId: string,
  ): Promise<MistralMessages[]> => {
    const convertedMessages: MistralMessages[] = [];
    // User Message
    if (message instanceof UserMessage) {
      const contentItems: Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; imageUrl: { url: string } }
      > = [];

      for (const content of message.content) {
        // Text Message Content
        if (content instanceof TextMessageContent) {
          contentItems.push({
            type: 'text' as const,
            text: content.text,
          });
        }
        // Image Message Content
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

      if (contentItems.length > 0) {
        convertedMessages.push({
          role: 'user' as const,
          content: contentItems,
        });
      }
    }

    if (message instanceof AssistantMessage) {
      let assistantTextMessageContent: string | undefined = undefined;
      let assistantToolUseMessageContent: MistralToolCall[] | undefined =
        undefined;

      for (const content of message.content) {
        // Text Message Content
        if (content instanceof TextMessageContent) {
          assistantTextMessageContent = content.text;
        }
        // Tool Use Message Content
        if (content instanceof ToolUseMessageContent) {
          if (!assistantToolUseMessageContent) {
            assistantToolUseMessageContent = [
              {
                id: content.id,
                type: 'function',
                function: {
                  name: content.name,
                  arguments: content.params,
                },
              },
            ];
          } else {
            assistantToolUseMessageContent.push({
              id: content.id,
              type: 'function',
              function: {
                name: content.name,
                arguments: content.params,
              },
            });
          }
        }
      }
      convertedMessages.push({
        role: 'assistant' as const,
        content: assistantTextMessageContent,
        toolCalls: assistantToolUseMessageContent,
      });
    }

    if (message instanceof SystemMessage) {
      for (const content of message.content) {
        convertedMessages.push({
          role: 'system' as const,
          content: content.text,
        });
      }
    }

    if (message instanceof ToolResultMessage) {
      for (const content of message.content) {
        convertedMessages.push({
          role: 'tool' as const,
          toolCallId: content.toolId,
          content: content.result,
        });
      }
      if (
        message.content.every(
          (c) => c.result === 'Tool has been displayed successfully',
        )
      ) {
        convertedMessages.push({
          role: 'assistant' as const,
          content: 'Awaiting user input',
        });
      }
    }

    return convertedMessages;
  };

  private convertToolChoice = (
    toolChoice: ModelToolChoice,
  ): MistralToolChoice | MistralToolChoiceEnum => {
    if (toolChoice === ModelToolChoice.AUTO) {
      return 'auto';
    } else if (toolChoice === ModelToolChoice.REQUIRED) {
      return 'required';
    } else {
      return { type: 'function', function: { name: toolChoice } };
    }
  };

  private parseCompletion = (
    response: ChatCompletionResponse,
  ): InferenceResponse => {
    const completion = response.choices && response.choices[0].message;
    const modelResponseContent: Array<
      TextMessageContent | ToolUseMessageContent
    > = [];

    if (!completion) {
      throw new InferenceFailedError('No completion returned from model', {
        source: 'mistral',
      });
    }

    if (completion.content) {
      // content is either string or array
      if (Array.isArray(completion.content)) {
        for (const content of completion.content) {
          if (content.type === 'text') {
            modelResponseContent.push(new TextMessageContent(content.text));
          }
        }
      } else if (completion.content) {
        // content is string
        modelResponseContent.push(new TextMessageContent(completion.content));
      }
    }

    for (const tool of completion.toolCalls || []) {
      modelResponseContent.push(this.parseToolCall(tool));
    }

    const modelResponse: InferenceResponse = {
      content: modelResponseContent,
      meta: {
        inputTokens: response.usage.promptTokens,
        outputTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
      },
    };

    return modelResponse;
  };

  private parseToolCall = (
    toolCall: MistralToolCall,
  ): ToolUseMessageContent => {
    const id = toolCall.id || 'none';
    const name = toolCall.function.name;
    const parameters = toolCall.function.arguments;
    if (typeof parameters === 'string') {
      return new ToolUseMessageContent(
        id,
        name,
        JSON.parse(parameters) as Record<string, unknown>,
      );
    }
    return new ToolUseMessageContent(id, name, parameters);
  };

  private async convertImageContent(
    content: ImageMessageContent,
    context: { orgId: string; threadId: string; messageId: string },
  ): Promise<string> {
    const imageData = await this.imageContentService.convertImageToBase64(
      content,
      context,
    );

    return `data:${imageData.contentType};base64,${imageData.base64}`;
  }
}
