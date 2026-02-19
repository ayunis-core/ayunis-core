import {
  StreamInferenceHandler,
  StreamInferenceInput,
  StreamInferenceResponseChunk,
  StreamInferenceResponseChunkToolCall,
} from '../../application/ports/stream-inference.handler';
import { Observable, Subscriber } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { FunctionParameters } from 'openai/resources/shared';
import { Logger, Injectable } from '@nestjs/common';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { ModelToolChoice } from '../../domain/value-objects/model-tool-choice.enum';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import { Message } from 'src/domain/messages/domain/message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { normalizeSchemaForOpenAI } from '../util/normalize-schema-for-openai';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';

@Injectable()
export class OpenAIStreamInferenceHandler implements StreamInferenceHandler {
  private readonly logger = new Logger(OpenAIStreamInferenceHandler.name);
  private readonly client: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly imageContentService: ImageContentService,
  ) {
    this.client = new OpenAI({
      apiKey: this.configService.get('openai.apiKey'),
    });
  }

  answer(
    input: StreamInferenceInput,
  ): Observable<StreamInferenceResponseChunk> {
    return new Observable<StreamInferenceResponseChunk>((subscriber) => {
      void this.streamResponse(input, subscriber);
    });
  }

  private async streamResponse(
    input: StreamInferenceInput,
    subscriber: Subscriber<StreamInferenceResponseChunk>,
  ): Promise<void> {
    try {
      const { messages, tools, toolChoice, orgId } = input;
      const openAiTools = tools.map(this.convertTool);
      const openAiMessages = await this.convertMessages(messages, orgId);
      const isGpt5 = input.model.name.startsWith('gpt-5');

      const completionOptions: OpenAI.Responses.ResponseCreateParamsStreaming =
        {
          instructions: input.systemPrompt,
          input: openAiMessages,
          reasoning: isGpt5
            ? {
                effort: 'low',
              }
            : undefined,
          model: input.model.name,
          stream: true,
          store: false,
          tools: openAiTools,
          tool_choice: toolChoice
            ? this.convertToolChoice(toolChoice)
            : undefined,
        };
      this.logger.debug('completionOptions', completionOptions);
      const completionFn = () =>
        this.client.responses.create(completionOptions);

      const response = await retryWithBackoff({
        fn: completionFn,
        maxRetries: 3,
        delay: 1000,
      });

      for await (const chunk of response) {
        const delta = this.convertChunk(chunk);
        if (!delta) continue;
        subscriber.next(delta);
      }

      subscriber.complete();
    } catch (error) {
      subscriber.error(error);
    }
  }

  private convertTool = (tool: Tool): OpenAI.Responses.Tool => {
    return {
      type: 'function' as const,
      name: tool.name,
      description: tool.description,
      parameters: normalizeSchemaForOpenAI(
        tool.parameters as Record<string, unknown> | undefined,
      ) as FunctionParameters | null,
      strict: true,
    };
  };

  private convertMessages = async (
    messages: Message[],
    orgId: string,
  ): Promise<OpenAI.Responses.ResponseInput> => {
    const convertedMessages: OpenAI.Responses.ResponseInputItem[] = [];
    for (const message of messages) {
      convertedMessages.push(...(await this.convertMessage(message, orgId)));
    }
    return convertedMessages;
  };

  private convertMessage = async (
    message: Message,
    orgId: string,
  ): Promise<OpenAI.Responses.ResponseInputItem[]> => {
    /** Assistant messages in Ayunis Core contain both text and tool call,
     *  so one assistant message is converted to multiple OpenAI messages.
     */

    if (message instanceof UserMessage) {
      const convertedMessage: OpenAI.Responses.ResponseInputItem.Message = {
        role: 'user' as const,
        content: [],
      };
      for (const content of message.content) {
        // Text Message Content
        if (content instanceof TextMessageContent) {
          convertedMessage.content.push({
            type: 'input_text',
            text: content.text,
          });
        }
        // Image Message Content
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

    if (message instanceof AssistantMessage) {
      const convertedMessages: OpenAI.Responses.ResponseInputItem[] = [];

      for (const content of message.content) {
        // Thinking / Reasoning Content
        if (content instanceof ThinkingMessageContent) {
          if (content.id || content.signature) {
            const reasoningItem: Record<string, unknown> = {
              type: 'reasoning',
              id: content.id ?? undefined,
              summary: [{ type: 'summary_text', text: content.thinking }],
            };
            if (content.signature) {
              reasoningItem.encrypted_content = content.signature;
            }
            convertedMessages.push(
              reasoningItem as unknown as OpenAI.Responses.ResponseInputItem,
            );
          }
          continue;
        }
        // Text Message Content
        if (content instanceof TextMessageContent) {
          convertedMessages.push({
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
        // Tool Use Message Content
        if (content instanceof ToolUseMessageContent) {
          const convertedAssistantToolCallMessage: OpenAI.Responses.ResponseFunctionToolCallItem =
            {
              id: 'fc_' + content.id,
              call_id: content.id,
              type: 'function_call',
              name: content.name,
              arguments: JSON.stringify(content.params),
            };
          convertedMessages.push(convertedAssistantToolCallMessage);
        }
      }
      return convertedMessages;
    }

    if (message instanceof SystemMessage) {
      const convertedMessage: OpenAI.Responses.ResponseInputItem.Message = {
        role: 'system' as const,
        content: [],
      };
      for (const content of message.content) {
        convertedMessage.content.push({
          type: 'input_text' as const,
          text: content.text,
        });
      }
      return [convertedMessage];
    }

    if (message instanceof ToolResultMessage) {
      const convertedMessages: OpenAI.Responses.ResponseFunctionToolCallOutputItem[] =
        [];
      for (const content of message.content) {
        convertedMessages.push({
          id: 'fc_' + message.id,
          status: 'completed' as const,
          type: 'function_call_output',
          call_id: content.toolId,
          output: content.result,
        });
      }
      return convertedMessages;
    }

    this.logger.warn('Unknown message type', message);
    return [];
  };

  private convertToolChoice = (
    toolChoice: ModelToolChoice,
  ):
    | OpenAI.Responses.ToolChoiceOptions
    | OpenAI.Responses.ToolChoiceTypes
    | OpenAI.Responses.ToolChoiceFunction => {
    if (toolChoice === ModelToolChoice.AUTO) {
      return 'auto';
    } else if (toolChoice === ModelToolChoice.REQUIRED) {
      return 'required';
    } else {
      return { type: 'function', name: toolChoice };
    }
  };

  private convertChunk = (
    chunk: OpenAI.Responses.ResponseStreamEvent,
  ): StreamInferenceResponseChunk | null => {
    if (chunk.type !== 'response.output_text.delta')
      this.logger.debug('convertChunk', chunk);
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- OpenAI SDK emits many event types; we only handle the ones we care about
    switch (chunk.type) {
      case 'response.reasoning_summary_text.delta':
        return new StreamInferenceResponseChunk({
          thinkingDelta: chunk.delta ?? null,
          textContentDelta: null,
          toolCallsDelta: [],
        });
      case 'response.output_text.delta':
        return new StreamInferenceResponseChunk({
          thinkingDelta: null,
          textContentDelta: chunk.delta ?? null,
          toolCallsDelta: [],
        });
      case 'response.completed': {
        const usage = chunk.response.usage;

        // Extract reasoning metadata (id, encrypted_content) from first reasoning output item
        let thinkingId: string | null = null;
        let thinkingSignature: string | null = null;
        const reasoningItem = chunk.response.output.find(
          (item) => item.type === 'reasoning',
        );
        if (reasoningItem && 'id' in reasoningItem) {
          thinkingId = (reasoningItem as { id?: string }).id ?? null;
          thinkingSignature =
            (reasoningItem as { encrypted_content?: string })
              .encrypted_content ?? null;
        }

        return new StreamInferenceResponseChunk({
          thinkingDelta: null,
          thinkingId,
          thinkingSignature,
          textContentDelta: null,
          toolCallsDelta: [],
          finishReason: 'stop',
          usage: usage
            ? {
                inputTokens: usage.input_tokens,
                outputTokens: usage.output_tokens,
              }
            : undefined,
        });
      }
      case 'response.function_call_arguments.delta':
        return new StreamInferenceResponseChunk({
          thinkingDelta: null,
          textContentDelta: null,
          toolCallsDelta: [
            new StreamInferenceResponseChunkToolCall({
              index: chunk.output_index, // TODO: org sequence_number?
              id: chunk.item_id ?? null,
              name: null,
              argumentsDelta: chunk.delta ?? null,
            }),
          ],
        });
      case 'response.output_item.added':
        if (chunk.item.type === 'function_call') {
          return new StreamInferenceResponseChunk({
            thinkingDelta: null,
            textContentDelta: null,
            toolCallsDelta: [
              new StreamInferenceResponseChunkToolCall({
                index: chunk.output_index,
                id: chunk.item.id ?? null,
                name: chunk.item.name,
                argumentsDelta: null,
              }),
            ],
          });
        }
        return null;
      default:
        return null;
    }
  };

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
