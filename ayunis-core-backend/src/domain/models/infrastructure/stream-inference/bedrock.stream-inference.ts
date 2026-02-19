import { Injectable, Logger } from '@nestjs/common';
import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import {
  StreamInferenceHandler,
  StreamInferenceInput,
  StreamInferenceResponseChunk,
  StreamInferenceResponseChunkToolCall,
} from '../../application/ports/stream-inference.handler';
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
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';

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
  | { type: 'tool_result'; tool_use_id: string; content: string }
  | { type: 'thinking'; thinking: string; signature: string };

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
    subscriber: import('rxjs').Subscriber<StreamInferenceResponseChunk>,
  ): Promise<void> {
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
    // Handle content_block_delta events
    if (chunk.type === 'content_block_delta') {
      const deltaChunk = chunk as BedrockContentBlockDelta;
      if (deltaChunk.delta.type === 'thinking_delta') {
        return new StreamInferenceResponseChunk({
          thinkingDelta: deltaChunk.delta.thinking,
          textContentDelta: null,
          toolCallsDelta: [],
        });
      }
      if (deltaChunk.delta.type === 'signature_delta') {
        return new StreamInferenceResponseChunk({
          thinkingDelta: null,
          thinkingSignature: deltaChunk.delta.signature,
          textContentDelta: null,
          toolCallsDelta: [],
        });
      }
      if (deltaChunk.delta.type === 'text_delta') {
        return new StreamInferenceResponseChunk({
          thinkingDelta: null,
          textContentDelta: deltaChunk.delta.text,
          toolCallsDelta: [],
        });
      }
      if (deltaChunk.delta.type === 'input_json_delta') {
        return new StreamInferenceResponseChunk({
          thinkingDelta: null,
          textContentDelta: null,
          toolCallsDelta: [
            new StreamInferenceResponseChunkToolCall({
              index: deltaChunk.index,
              id: null,
              name: null,
              argumentsDelta: deltaChunk.delta.partial_json,
            }),
          ],
        });
      }
    }

    // Handle content_block_start events
    if (chunk.type === 'content_block_start') {
      const startChunk = chunk as BedrockContentBlockStart;
      if (startChunk.content_block.type === 'thinking') {
        // Thinking block start — content arrives via thinking_delta events
        return null;
      }
      if (startChunk.content_block.type === 'tool_use') {
        const toolBlock =
          startChunk.content_block as BedrockToolUseContentBlock;
        return new StreamInferenceResponseChunk({
          thinkingDelta: null,
          textContentDelta: null,
          toolCallsDelta: [
            new StreamInferenceResponseChunkToolCall({
              index: startChunk.index,
              id: toolBlock.id,
              name: toolBlock.name,
              argumentsDelta: null,
            }),
          ],
        });
      }
    }

    // Handle message_start for input tokens
    if (chunk.type === 'message_start') {
      const messageChunk = chunk as BedrockMessageStart;
      const usage = messageChunk.message.usage;
      if (usage?.input_tokens !== undefined) {
        return new StreamInferenceResponseChunk({
          thinkingDelta: null,
          textContentDelta: null,
          toolCallsDelta: [],
          usage: {
            inputTokens: usage.input_tokens,
            outputTokens: undefined,
          },
        });
      }
    }

    // Handle message_delta for output tokens
    if (chunk.type === 'message_delta') {
      const deltaChunk = chunk as BedrockMessageDelta;
      const usage = deltaChunk.usage;
      if (usage?.output_tokens !== undefined) {
        return new StreamInferenceResponseChunk({
          thinkingDelta: null,
          textContentDelta: null,
          toolCallsDelta: [],
          usage: {
            inputTokens: undefined,
            outputTokens: usage.output_tokens,
          },
        });
      }
    }

    return null;
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

      if (
        message.role === MessageRole.ASSISTANT ||
        lastMessage.role === 'assistant'
      ) {
        result.push(converted);
      } else {
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
      const content: AnthropicContent[] = message.content
        .map((c): AnthropicContent | null => {
          if (c instanceof ThinkingMessageContent) {
            if (!c.signature) return null;
            return {
              type: 'thinking' as const,
              thinking: c.thinking,
              signature: c.signature,
            };
          }
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
        })
        .filter((block): block is AnthropicContent => block !== null);
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
}
