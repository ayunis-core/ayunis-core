import { Injectable, Logger } from '@nestjs/common';
import {
  InferenceHandler,
  InferenceInput,
  InferenceResponse,
} from '../../application/ports/inference.handler';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { Message } from 'src/domain/messages/domain/message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import { ModelToolChoice } from '../../domain/value-objects/model-tool-choice.enum';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { InferenceFailedError } from 'src/domain/models/application/models.errors';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';

@Injectable()
export class OpenAIInferenceHandler extends InferenceHandler {
  private readonly logger = new Logger(OpenAIInferenceHandler.name);
  private readonly client: OpenAI;

  constructor(private readonly configService: ConfigService) {
    super();
    this.client = new OpenAI({
      apiKey: this.configService.get('openai.apiKey'),
    });
  }

  async answer(input: InferenceInput): Promise<InferenceResponse> {
    this.logger.log('answer', input);
    try {
      const { messages, tools, toolChoice } = input;
      const openAiTools = tools?.map(this.convertTool);
      const openAiMessages = this.convertMessages(messages);
      const completionOptions: OpenAI.Responses.ResponseCreateParamsNonStreaming =
        /**
         * When we add thinking capability, remember to
         * add reasoning.encrypted_content in include (see comment)
         * https://platform.openai.com/docs/guides/migrate-to-responses#4-decide-when-to-use-statefulness
         */
        {
          include: ['reasoning.encrypted_content'],
          instructions: input.systemPrompt,
          input: openAiMessages,
          model: input.model.name,
          stream: false,
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
      const modelResponse = this.parseCompletion(response);

      return modelResponse;
    } catch (error) {
      this.logger.error('Failed to get response from OpenAI', error);
      if (error instanceof InferenceFailedError) {
        throw error;
      }
      throw new InferenceFailedError('OpenAI inference failed', {
        source: 'openai',
        originalError:
          error instanceof Error ? error : new Error('Unknown error'),
      });
    }
  }

  private convertTool = (tool: Tool): OpenAI.Responses.Tool => {
    return {
      type: 'function' as const,
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as Record<string, unknown> | null,
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

  private parseCompletion = (
    response: OpenAI.Responses.Response,
  ): InferenceResponse => {
    const completion = response.output;

    if (!completion) {
      throw new InferenceFailedError('No completion returned from model', {
        source: 'openai',
      });
    }

    const modelResponseContent: Array<
      TextMessageContent | ToolUseMessageContent
    > = [];

    for (const completionItem of completion) {
      if (completionItem.type === 'message') {
        for (const content of completionItem.content) {
          if (content.type === 'output_text') {
            modelResponseContent.push(new TextMessageContent(content.text));
          }
        }
      }
      if (completionItem.type === 'function_call') {
        modelResponseContent.push(this.parseToolCall(completionItem));
      }
    }

    const responseMeta: InferenceResponse['meta'] = {
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      totalTokens: response.usage?.total_tokens,
    };

    const modelResponse: InferenceResponse = {
      content: modelResponseContent,
      meta: responseMeta,
    };
    return modelResponse;
  };

  private parseToolCall(
    toolCall: OpenAI.Responses.ResponseFunctionToolCall,
  ): ToolUseMessageContent {
    const id = toolCall.call_id;
    const name = toolCall.name;
    const parameters = JSON.parse(toolCall.arguments) as Record<
      string,
      unknown
    >;
    return new ToolUseMessageContent(id, name, parameters);
  }
}
