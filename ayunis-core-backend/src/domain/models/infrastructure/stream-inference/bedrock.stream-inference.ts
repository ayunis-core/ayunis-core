import { Injectable, Logger } from '@nestjs/common';
import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { ConfigService } from '@nestjs/config';
import { Observable, Subscriber } from 'rxjs';
import {
  StreamInferenceHandler,
  StreamInferenceInput,
  StreamInferenceResponseChunk,
  StreamInferenceResponseChunkToolCall,
} from '../../application/ports/stream-inference.handler';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
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

// Bedrock streaming event types
interface BedrockTextDelta {
  type: 'text_delta';
  text: string;
}

interface BedrockInputJsonDelta {
  type: 'input_json_delta';
  partial_json: string;
}

interface BedrockThinkingDelta {
  type: 'thinking_delta';
  thinking: string;
}

interface BedrockSignatureDelta {
  type: 'signature_delta';
  signature: string;
}

interface BedrockContentBlockDelta {
  type: 'content_block_delta';
  index: number;
  delta:
    | BedrockTextDelta
    | BedrockInputJsonDelta
    | BedrockThinkingDelta
    | BedrockSignatureDelta;
}

interface BedrockToolUseContentBlock {
  type: 'tool_use';
  id: string;
  name: string;
}

interface BedrockThinkingContentBlock {
  type: 'thinking';
}

interface BedrockContentBlockStart {
  type: 'content_block_start';
  index: number;
  content_block:
    | BedrockToolUseContentBlock
    | BedrockThinkingContentBlock
    | { type: string };
}

interface BedrockMessageStart {
  type: 'message_start';
  message: {
    usage?: {
      input_tokens: number;
    };
  };
}

interface BedrockMessageDelta {
  type: 'message_delta';
  usage?: {
    output_tokens: number;
  };
}

type BedrockStreamEvent =
  | BedrockContentBlockDelta
  | BedrockContentBlockStart
  | BedrockMessageStart
  | BedrockMessageDelta
  | { type: string };

@Injectable()
export class BedrockStreamInferenceHandler implements StreamInferenceHandler {
  private readonly logger = new Logger(BedrockStreamInferenceHandler.name);
  private readonly client: BedrockRuntimeClient;
  private readonly converter: BedrockMessageConverter;

  constructor(
    private readonly configService: ConfigService,
    private readonly imageContentService: ImageContentService,
  ) {
    const awsRegion = this.configService.get<string>(
      'models.bedrock.awsRegion',
    );
    const awsAccessKeyId = this.configService.get<string>(
      'models.bedrock.awsAccessKeyId',
    );
    const awsSecretAccessKey = this.configService.get<string>(
      'models.bedrock.awsSecretAccessKey',
    );

    this.logger.log('Initializing Bedrock stream client', {
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

  answer(
    input: StreamInferenceInput,
  ): Observable<StreamInferenceResponseChunk> {
    this.logger.log('Bedrock stream inference request', {
      model: input.model.name,
      provider: input.model.provider,
      messageCount: input.messages.length,
    });

    return new Observable<StreamInferenceResponseChunk>((subscriber) => {
      this.streamResponse(input, subscriber).catch((error: unknown) => {
        this.logger.error('Bedrock stream inference failed', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          model: input.model.name,
        });
        subscriber.error(error);
      });
    });
  }

  private async streamResponse(
    input: StreamInferenceInput,
    subscriber: Subscriber<StreamInferenceResponseChunk>,
  ): Promise<void> {
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
      max_tokens: 100000,
      system: systemPrompt,
      messages: anthropicMessages,
      tools: anthropicTools,
      tool_choice: anthropicToolChoice,
    };

    this.logger.debug('Bedrock stream request body', { requestBody });

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: input.model.name,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    });

    const response = await this.client.send(command);

    if (!response.body) {
      throw new Error('No response body from Bedrock');
    }

    for await (const event of response.body) {
      if (event.chunk?.bytes) {
        const chunkData = JSON.parse(
          new TextDecoder().decode(event.chunk.bytes),
        ) as BedrockStreamEvent;

        const chunk = this.convertChunk(chunkData);
        if (chunk) {
          subscriber.next(chunk);
        }
      }
    }

    subscriber.complete();
  }

  private convertChunk(
    chunk: BedrockStreamEvent,
  ): StreamInferenceResponseChunk | null {
    if (chunk.type === 'content_block_delta')
      return this.convertContentBlockDelta(chunk as BedrockContentBlockDelta);
    if (chunk.type === 'content_block_start')
      return this.convertContentBlockStart(chunk as BedrockContentBlockStart);
    if (chunk.type === 'message_start')
      return this.convertMessageStart(chunk as BedrockMessageStart);
    if (chunk.type === 'message_delta')
      return this.convertMessageDelta(chunk as BedrockMessageDelta);
    return null;
  }

  private convertContentBlockDelta(
    chunk: BedrockContentBlockDelta,
  ): StreamInferenceResponseChunk | null {
    if (chunk.delta.type === 'thinking_delta') {
      return new StreamInferenceResponseChunk({
        thinkingDelta: chunk.delta.thinking,
        textContentDelta: null,
        toolCallsDelta: [],
      });
    }
    if (chunk.delta.type === 'signature_delta') {
      return new StreamInferenceResponseChunk({
        thinkingDelta: null,
        thinkingSignature: chunk.delta.signature,
        textContentDelta: null,
        toolCallsDelta: [],
      });
    }
    if (chunk.delta.type === 'text_delta') {
      return new StreamInferenceResponseChunk({
        thinkingDelta: null,
        textContentDelta: chunk.delta.text,
        toolCallsDelta: [],
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- exhaustive guard
    if (chunk.delta.type === 'input_json_delta') {
      return new StreamInferenceResponseChunk({
        thinkingDelta: null,
        textContentDelta: null,
        toolCallsDelta: [
          new StreamInferenceResponseChunkToolCall({
            index: chunk.index,
            id: null,
            name: null,
            argumentsDelta: chunk.delta.partial_json,
          }),
        ],
      });
    }
    return null;
  }

  private convertContentBlockStart(
    chunk: BedrockContentBlockStart,
  ): StreamInferenceResponseChunk | null {
    if (chunk.content_block.type === 'thinking') return null;
    if (chunk.content_block.type === 'tool_use') {
      const toolBlock = chunk.content_block as BedrockToolUseContentBlock;
      return new StreamInferenceResponseChunk({
        thinkingDelta: null,
        textContentDelta: null,
        toolCallsDelta: [
          new StreamInferenceResponseChunkToolCall({
            index: chunk.index,
            id: toolBlock.id,
            name: toolBlock.name,
            argumentsDelta: null,
          }),
        ],
      });
    }
    return null;
  }

  private convertMessageStart(
    chunk: BedrockMessageStart,
  ): StreamInferenceResponseChunk | null {
    const usage = chunk.message.usage;
    if (!usage?.input_tokens) return null;
    return new StreamInferenceResponseChunk({
      thinkingDelta: null,
      textContentDelta: null,
      toolCallsDelta: [],
      usage: { inputTokens: usage.input_tokens, outputTokens: undefined },
    });
  }

  private convertMessageDelta(
    chunk: BedrockMessageDelta,
  ): StreamInferenceResponseChunk | null {
    const usage = chunk.usage;
    if (!usage?.output_tokens) return null;
    return new StreamInferenceResponseChunk({
      thinkingDelta: null,
      textContentDelta: null,
      toolCallsDelta: [],
      usage: { inputTokens: undefined, outputTokens: usage.output_tokens },
    });
  }
}
