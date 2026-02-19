import { Injectable, Logger } from '@nestjs/common';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { ConfigService } from '@nestjs/config';
import {
  InferenceHandler,
  InferenceInput,
  InferenceResponse,
} from '../../application/ports/inference.handler';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { Message } from 'src/domain/messages/domain/message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import { ModelToolChoice } from '../../domain/value-objects/model-tool-choice.enum';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { InferenceFailedError } from 'src/domain/models/application/models.errors';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: AnthropicContent[];
}

type AnthropicContent =
  | { type: 'text'; text: string }
  | {
      type: 'image';
      source: { type: 'base64'; media_type: string; data: string };
    }
  | { type: 'tool_use'; id: string; name: string; input: object }
  | { type: 'tool_result'; tool_use_id: string; content: string };

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: object;
}

interface AnthropicToolChoice {
  type: 'auto' | 'any' | 'tool';
  name?: string;
}

interface BedrockAnthropicRequest {
  anthropic_version: string;
  max_tokens: number;
  system?: string;
  messages: AnthropicMessage[];
  tools?: AnthropicTool[];
  tool_choice?: AnthropicToolChoice;
}

interface BedrockAnthropicResponse {
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'tool_use'; id: string; name: string; input: object }
  >;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

@Injectable()
export class BedrockInferenceHandler extends InferenceHandler {
  private readonly logger = new Logger(BedrockInferenceHandler.name);
  private readonly client: BedrockRuntimeClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly imageContentService: ImageContentService,
  ) {
    super();
    const awsRegion = this.configService.get<string>(
      'models.bedrock.awsRegion',
    );
    const awsAccessKeyId = this.configService.get<string>(
      'models.bedrock.awsAccessKeyId',
    );
    const awsSecretAccessKey = this.configService.get<string>(
      'models.bedrock.awsSecretAccessKey',
    );

    this.logger.log('Initializing Bedrock client', {
      awsRegion,
      hasAccessKey: !!awsAccessKeyId,
      hasSecretKey: !!awsSecretAccessKey,
    });

    this.client = new BedrockRuntimeClient({
      region: awsRegion || 'us-east-1',
      credentials:
        awsAccessKeyId && awsSecretAccessKey
          ? {
              accessKeyId: awsAccessKeyId,
              secretAccessKey: awsSecretAccessKey,
            }
          : undefined,
    });
  }

  async answer(input: InferenceInput): Promise<InferenceResponse> {
    this.logger.log('Bedrock inference request', {
      model: input.model.name,
      provider: input.model.provider,
      messageCount: input.messages.length,
    });

    try {
      const { messages, tools, toolChoice, systemPrompt, orgId } = input;
      const anthropicMessages = await this.convertMessages(messages, orgId);
      const anthropicTools = tools.map((tool) => this.convertTool(tool));
      const anthropicToolChoice = toolChoice
        ? this.convertToolChoice(toolChoice)
        : undefined;

      const requestBody: BedrockAnthropicRequest = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4096,
        system: systemPrompt,
        messages: anthropicMessages,
        tools: anthropicTools,
        tool_choice: anthropicToolChoice,
      };

      this.logger.debug('Bedrock request body', { requestBody });

      const command = new InvokeModelCommand({
        modelId: input.model.name,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(
        new TextDecoder().decode(response.body),
      ) as BedrockAnthropicResponse;

      this.logger.debug('Bedrock response', { responseBody });

      return this.parseResponse(responseBody);
    } catch (error: unknown) {
      this.logger.error('Bedrock inference failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        model: input.model.name,
      });

      if (error instanceof InferenceFailedError) {
        throw error;
      }
      throw new InferenceFailedError('Bedrock inference failed', {
        source: 'bedrock',
        originalError:
          error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  private convertTool(tool: Tool): AnthropicTool {
    return {
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters as object,
    };
  }

  private convertToolChoice(toolChoice: ModelToolChoice): AnthropicToolChoice {
    if (toolChoice === ModelToolChoice.AUTO) {
      return { type: 'auto' };
    } else if (toolChoice === ModelToolChoice.REQUIRED) {
      return { type: 'any' };
    } else {
      return { type: 'tool', name: toolChoice };
    }
  }

  private async convertMessages(
    messages: Message[],
    orgId: string,
  ): Promise<AnthropicMessage[]> {
    const result: AnthropicMessage[] = [];

    for (const message of messages) {
      const converted = await this.convertMessage(message, orgId);

      if (result.length === 0) {
        result.push(converted);
        continue;
      }

      const lastMessage = result[result.length - 1];

      // Anthropic requires alternating user/assistant messages
      if (
        message.role === MessageRole.ASSISTANT ||
        lastMessage.role === 'assistant'
      ) {
        result.push(converted);
      } else {
        // Merge consecutive user messages
        lastMessage.content.push(...converted.content);
      }
    }

    return result;
  }

  private async convertMessage(
    message: Message,
    orgId: string,
  ): Promise<AnthropicMessage> {
    if (message instanceof UserMessage) {
      const content: AnthropicContent[] = [];
      for (const c of message.content) {
        if (c instanceof TextMessageContent) {
          content.push({ type: 'text', text: c.text });
        } else if (c instanceof ImageMessageContent) {
          const imageData = await this.imageContentService.convertImageToBase64(
            c,
            { orgId, threadId: message.threadId, messageId: message.id },
          );
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: imageData.contentType,
              data: imageData.base64,
            },
          });
        }
      }
      return { role: 'user', content };
    }

    if (message instanceof AssistantMessage) {
      const content: AnthropicContent[] = message.content.map((c) => {
        if (c instanceof TextMessageContent) {
          return { type: 'text' as const, text: c.text };
        }
        if (c instanceof ToolUseMessageContent) {
          return {
            type: 'tool_use' as const,
            id: c.id,
            name: c.name,
            input: c.params,
          };
        }
        throw new Error('Unknown assistant content type');
      });
      return { role: 'assistant', content };
    }

    if (message instanceof ToolResultMessage) {
      const content: AnthropicContent[] = message.content.map((c) => ({
        type: 'tool_result' as const,
        tool_use_id: c.toolId,
        content: c.result,
      }));
      return { role: 'user', content };
    }

    if (message instanceof SystemMessage) {
      const content: AnthropicContent[] = message.content.map((c) => ({
        type: 'text' as const,
        text: c.text,
      }));
      return { role: 'user', content };
    }

    throw new Error('Unknown message type');
  }

  private parseResponse(response: BedrockAnthropicResponse): InferenceResponse {
    if (!response) {
      throw new InferenceFailedError('No response from Bedrock', {
        source: 'bedrock',
      });
    }

    if (!['tool_use', 'end_turn'].includes(response.stop_reason || '')) {
      throw new InferenceFailedError(
        `Unexpected stop reason: ${response.stop_reason}`,
        { source: 'bedrock' },
      );
    }

    const content = response.content.map((c) => {
      if (c.type === 'text') {
        return new TextMessageContent(c.text);
      }
      if (c.type === 'tool_use') {
        return new ToolUseMessageContent(
          c.id,
          c.name,
          c.input as Record<string, unknown>,
        );
      }
      // This should never happen given our type definition, but handle it for safety
      throw new InferenceFailedError(
        `Unknown content type: ${(c as { type: string }).type}`,
        { source: 'bedrock' },
      );
    });

    return {
      content,
      meta: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }
}
