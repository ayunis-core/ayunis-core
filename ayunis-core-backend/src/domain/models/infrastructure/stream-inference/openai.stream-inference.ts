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
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';

@Injectable()
export class OpenAIStreamInferenceHandler implements StreamInferenceHandler {
  private readonly logger = new Logger(OpenAIStreamInferenceHandler.name);
  private readonly client: OpenAI;

  constructor(private readonly configService: ConfigService) {
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
      const { messages, tools, toolChoice } = input;
      const openAiTools = tools?.map(this.convertTool);
      const openAiMessages = this.convertMessages(messages);

      const completionOptions: OpenAI.Responses.ResponseCreateParamsStreaming =
        /**
         * When we add thinking capability, remember to
         * add reasoning.encrypted_content in include (see comment)
         * https://platform.openai.com/docs/guides/migrate-to-responses#4-decide-when-to-use-statefulness
         */
        {
          // include: ['reasoning.encrypted_content'],
          instructions: input.systemPrompt,
          input: openAiMessages,
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
      parameters: tool.parameters as FunctionParameters | null,
      strict: true,
    };
  };

  private convertMessages = (
    messages: Message[],
  ): OpenAI.Responses.ResponseInput => {
    const convertedMessages: OpenAI.Responses.ResponseInputItem[] = [];
    for (const message of messages) {
      convertedMessages.push(...this.convertMessage(message));
    }
    return convertedMessages;
  };

  private convertMessage = (
    message: Message,
  ): OpenAI.Responses.ResponseInputItem[] => {
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
        // TODO: Add other input types, such as images
      }
      return [convertedMessage];
    }

    if (message instanceof AssistantMessage) {
      const convertedMessages: Array<
        | OpenAI.Responses.ResponseOutputMessage
        | OpenAI.Responses.ResponseFunctionToolCallItem
      > = [];

      for (const content of message.content) {
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
    this.logger.debug('convertChunk', chunk);
    switch (chunk.type) {
      case 'response.output_text.delta':
        return new StreamInferenceResponseChunk({
          textContentDelta: chunk.delta ?? null,
          toolCallsDelta: [],
        });
      case 'response.function_call_arguments.delta':
        return new StreamInferenceResponseChunk({
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
}
