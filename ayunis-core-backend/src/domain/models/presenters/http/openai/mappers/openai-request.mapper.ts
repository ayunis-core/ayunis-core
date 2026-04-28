import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID, type UUID } from 'crypto';
import type { JSONSchema } from 'json-schema-to-ts';

import { GetInferenceCommand } from '../../../../application/use-cases/get-inference/get-inference.command';
import { StreamInferenceInput } from '../../../../application/ports/stream-inference.handler';
import type { PermittedLanguageModel } from '../../../../domain/permitted-model.entity';

import { ModelToolChoice } from '../../../../domain/value-objects/model-tool-choice.enum';
import type { Message } from 'src/domain/messages/domain/message.entity';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { OpenAICompatibilityTool } from 'src/domain/tools/domain/tools/openai-compatibility-tool.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';

import {
  ChatCompletionMessageDto,
  ChatCompletionRequestDto,
  ChatCompletionToolDto,
} from '../dto/chat-completion-request.dto';

interface MappedRequest {
  messages: Message[];
  tools: Tool[];
  toolChoice: ModelToolChoice;
  instructions?: string;
}

@Injectable()
export class OpenAIRequestMapper {
  toGetInferenceCommand(
    dto: ChatCompletionRequestDto,
    model: PermittedLanguageModel,
  ): GetInferenceCommand {
    const mapped = this.mapShared(dto);
    return new GetInferenceCommand({
      model: model.model,
      messages: mapped.messages,
      tools: mapped.tools,
      toolChoice: mapped.toolChoice,
      instructions: mapped.instructions,
    });
  }

  toStreamInferenceInput(
    dto: ChatCompletionRequestDto,
    model: PermittedLanguageModel,
    orgId: UUID,
  ): StreamInferenceInput {
    const mapped = this.mapShared(dto);
    return new StreamInferenceInput({
      model: model.model,
      messages: mapped.messages,
      systemPrompt: mapped.instructions ?? '',
      tools: mapped.tools,
      toolChoice: mapped.toolChoice,
      orgId,
    });
  }

  private mapShared(dto: ChatCompletionRequestDto): MappedRequest {
    const threadId = randomUUID();
    const { systemPrompt, conversation } = this.splitSystemMessages(
      dto.messages,
    );
    // Build a tool_call_id → function.name map. Tool result messages carry
    // only `tool_call_id` on the wire, so the name must be recovered from
    // the prior assistant message that emitted the call. Without this,
    // downstream provider converters that round-trip the name (Gemini, e.g.)
    // would send the call id where the function name should be and the model
    // would reject the request.
    const toolCallIdToName = this.buildToolCallIdToNameMap(conversation);
    const messages = conversation.map((msg) =>
      this.toDomainMessage(msg, threadId, toolCallIdToName),
    );
    const tools = (dto.tools ?? []).map((tool) => this.toDomainTool(tool));
    const toolChoice =
      dto.tool_choice === 'required'
        ? ModelToolChoice.REQUIRED
        : ModelToolChoice.AUTO;

    return {
      messages,
      tools,
      toolChoice,
      instructions: systemPrompt,
    };
  }

  private buildToolCallIdToNameMap(
    messages: ChatCompletionMessageDto[],
  ): Map<string, string> {
    const map = new Map<string, string>();
    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          map.set(tc.id, tc.function.name);
        }
      }
    }
    return map;
  }

  private splitSystemMessages(messages: ChatCompletionMessageDto[]): {
    systemPrompt?: string;
    conversation: ChatCompletionMessageDto[];
  } {
    const systemParts: string[] = [];
    const conversation: ChatCompletionMessageDto[] = [];
    for (const message of messages) {
      if (message.role === 'system') {
        if (typeof message.content === 'string' && message.content.length > 0) {
          systemParts.push(message.content);
        }
        continue;
      }
      conversation.push(message);
    }
    return {
      systemPrompt:
        systemParts.length > 0 ? systemParts.join('\n\n') : undefined,
      conversation,
    };
  }

  private toDomainMessage(
    dto: ChatCompletionMessageDto,
    threadId: UUID,
    toolCallIdToName: Map<string, string>,
  ): Message {
    switch (dto.role) {
      case 'user':
        return this.toUserMessage(dto, threadId);
      case 'assistant':
        return this.toAssistantMessage(dto, threadId);
      case 'tool':
        return this.toToolResultMessage(dto, threadId, toolCallIdToName);
      case 'system':
        // Plain system messages are folded into instructions earlier; this
        // branch only fires for stragglers (we still construct a real
        // SystemMessage so it threads through the inference handler).
        return new SystemMessage({
          threadId,
          content: [new TextMessageContent(dto.content ?? '')],
        });
    }
  }

  private toUserMessage(
    dto: ChatCompletionMessageDto,
    threadId: UUID,
  ): UserMessage {
    return new UserMessage({
      threadId,
      content: [new TextMessageContent(this.requireString(dto, 'content'))],
    });
  }

  private toAssistantMessage(
    dto: ChatCompletionMessageDto,
    threadId: UUID,
  ): AssistantMessage {
    const content: Array<TextMessageContent | ToolUseMessageContent> = [];
    if (typeof dto.content === 'string' && dto.content.length > 0) {
      content.push(new TextMessageContent(dto.content));
    }
    for (const toolCall of dto.tool_calls ?? []) {
      content.push(
        new ToolUseMessageContent(
          toolCall.id,
          toolCall.function.name,
          this.parseToolArguments(toolCall.function.arguments),
        ),
      );
    }
    if (content.length === 0) {
      throw new BadRequestException(
        'Assistant message must have content or tool_calls',
      );
    }
    return new AssistantMessage({ threadId, content });
  }

  private toToolResultMessage(
    dto: ChatCompletionMessageDto,
    threadId: UUID,
    toolCallIdToName: Map<string, string>,
  ): ToolResultMessage {
    if (!dto.tool_call_id) {
      throw new BadRequestException('Tool message must include tool_call_id');
    }
    const toolName = toolCallIdToName.get(dto.tool_call_id);
    if (!toolName) {
      throw new BadRequestException(
        `No matching tool_call found for tool_call_id "${dto.tool_call_id}" in any preceding assistant message`,
      );
    }
    return new ToolResultMessage({
      threadId,
      content: [
        new ToolResultMessageContent(
          dto.tool_call_id,
          toolName,
          this.requireString(dto, 'content'),
        ),
      ],
    });
  }

  private toDomainTool(tool: ChatCompletionToolDto): Tool {
    return new OpenAICompatibilityTool({
      name: tool.function.name,
      description: tool.function.description ?? '',
      parameters: (tool.function.parameters ?? {
        type: 'object',
        properties: {},
      }) as JSONSchema,
    });
  }

  private parseToolArguments(args: string): Record<string, unknown> {
    if (!args) return {};
    try {
      const parsed = JSON.parse(args) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      throw new Error('arguments must encode a JSON object');
    } catch (err) {
      throw new BadRequestException(
        `Invalid tool_call.function.arguments: ${
          err instanceof Error ? err.message : 'parse error'
        }`,
      );
    }
  }

  private requireString(
    dto: ChatCompletionMessageDto,
    field: 'content',
  ): string {
    const value = dto[field];
    if (typeof value !== 'string' || value.length === 0) {
      throw new BadRequestException(
        `Message with role "${dto.role}" requires a non-empty string \`${field}\``,
      );
    }
    return value;
  }
}
