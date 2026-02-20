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
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { InferenceFailedError } from 'src/domain/models/application/models.errors';
import {
  BedrockMessageConverter,
  BedrockAnthropicMessage,
  BedrockAnthropicTool,
  BedrockAnthropicToolChoice,
} from '../converters/bedrock-message.converter';

interface BedrockAnthropicRequest {
  anthropic_version: string;
  max_tokens: number;
  system?: string;
  messages: BedrockAnthropicMessage[];
  tools?: BedrockAnthropicTool[];
  tool_choice?: BedrockAnthropicToolChoice;
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
  private readonly converter: BedrockMessageConverter;

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
      region: awsRegion ?? 'us-east-1',
      credentials:
        awsAccessKeyId && awsSecretAccessKey
          ? {
              accessKeyId: awsAccessKeyId,
              secretAccessKey: awsSecretAccessKey,
            }
          : undefined,
    });
    this.converter = new BedrockMessageConverter(imageContentService);
  }

  async answer(input: InferenceInput): Promise<InferenceResponse> {
    this.logger.log('Bedrock inference request', {
      model: input.model.name,
      provider: input.model.provider,
      messageCount: input.messages.length,
    });

    try {
      const { messages, tools, toolChoice, systemPrompt, orgId } = input;
      const anthropicMessages = await this.converter.convertMessages(
        messages,
        orgId,
      );
      const anthropicTools = tools.map((t) => this.converter.convertTool(t));
      const anthropicToolChoice = toolChoice
        ? this.converter.convertToolChoice(toolChoice)
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

  private parseResponse(response: BedrockAnthropicResponse): InferenceResponse {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard
    if (!response) {
      throw new InferenceFailedError('No response from Bedrock', {
        source: 'bedrock',
      });
    }

    if (!['tool_use', 'end_turn'].includes(response.stop_reason)) {
      throw new InferenceFailedError(
        `Unexpected stop reason: ${response.stop_reason}`,
        { source: 'bedrock' },
      );
    }

    const content = response.content.map((c) => {
      if (c.type === 'text') {
        return new TextMessageContent(c.text);
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- exhaustive guard
      if (c.type === 'tool_use') {
        return new ToolUseMessageContent(
          c.id,
          c.name,
          c.input as Record<string, unknown>,
        );
      }
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
