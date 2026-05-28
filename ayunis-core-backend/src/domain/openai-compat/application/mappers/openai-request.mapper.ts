import { Injectable } from '@nestjs/common';
import { randomUUID, type UUID } from 'crypto';
import { Message } from 'src/domain/messages/domain/message.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import type { ToolSchema } from 'src/domain/models/domain/value-objects/tool-schema';
import type { JSONSchema } from 'json-schema-to-ts';
import { OpenAIInvalidRequestError } from '../openai-compat.errors';
import type {
  OpenAIChatCompletionMessage,
  OpenAIChatCompletionRequest,
} from '../types/openai-request.types';

/**
 * Maps OpenAI chat-completion request DTOs into the domain shapes that
 * `GetInferenceUseCase` / `StreamInferenceUseCase` expect.
 *
 * Tool-call scoping note: the previous attempt built a *global*
 * tool_call_id → name map across the entire conversation, so a tool result
 * for a reused id resolved to the first-ever occurrence instead of the
 * most-recent assistant turn that emitted it. This mapper rebuilds the map
 * per assistant turn — tool results resolve against the most recent
 * assistant turn that introduced the id (AYC-78 finding I6).
 */
@Injectable()
export class OpenAIRequestMapper {
  toDomainMessages(
    request: OpenAIChatCompletionRequest,
    threadId: UUID,
  ): {
    systemPrompt: string;
    messages: Message[];
  } {
    const messages: Message[] = [];
    let systemPrompt = '';
    let currentTurnToolMap = new Map<string, string>();

    for (const msg of request.messages) {
      if (msg.role === 'system' || msg.role === 'developer') {
        // OpenAI's 'developer' role (o1+ models) replaces 'system' — fold
        // both into the same system prompt.
        const text = this.extractTextContent(msg);
        systemPrompt = systemPrompt ? `${systemPrompt}\n\n${text}` : text;
      } else if (msg.role === 'user') {
        messages.push(this.buildUserMessage(msg, threadId));
      } else if (msg.role === 'assistant') {
        currentTurnToolMap = new Map();
        messages.push(
          this.buildAssistantMessage(msg, threadId, currentTurnToolMap),
        );
      } else {
        messages.push(
          this.buildToolResultMessage(msg, threadId, currentTurnToolMap),
        );
      }
    }

    return { systemPrompt, messages };
  }

  private buildUserMessage(
    msg: OpenAIChatCompletionMessage,
    threadId: UUID,
  ): UserMessage {
    // OpenAI permits empty user content (turn markers, conversation
    // replays). Forward an empty TextMessageContent rather than throwing.
    const text = this.extractTextContent(msg);
    return new UserMessage({
      threadId,
      content: [new TextMessageContent(text)],
    });
  }

  private buildAssistantMessage(
    msg: OpenAIChatCompletionMessage,
    threadId: UUID,
    turnToolMap: Map<string, string>,
  ): AssistantMessage {
    const blocks: Array<TextMessageContent | ToolUseMessageContent> = [];

    const text = this.extractTextContent(msg);
    if (text) {
      blocks.push(new TextMessageContent(text));
    }
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      for (const tc of msg.tool_calls) {
        const parsedArgs = this.safeParseToolArgs(tc.function.arguments);
        blocks.push(
          new ToolUseMessageContent(tc.id, tc.function.name, parsedArgs),
        );
        turnToolMap.set(tc.id, tc.function.name);
      }
    }
    if (blocks.length === 0) {
      // OpenAI clients sometimes replay assistant turns with content=null
      // and no tool_calls (placeholders / continuation markers). Emit an
      // empty text block so the domain model accepts it instead of throwing.
      blocks.push(new TextMessageContent(''));
    }
    return new AssistantMessage({ threadId, content: blocks });
  }

  private buildToolResultMessage(
    msg: OpenAIChatCompletionMessage,
    threadId: UUID,
    turnToolMap: Map<string, string>,
  ): ToolResultMessage {
    if (!msg.tool_call_id) {
      throw new OpenAIInvalidRequestError(
        'tool message must include tool_call_id',
      );
    }
    const toolName = turnToolMap.get(msg.tool_call_id) ?? msg.name ?? 'unknown';
    const result = this.extractTextContent(msg);
    return new ToolResultMessage({
      threadId,
      content: [
        new ToolResultMessageContent(msg.tool_call_id, toolName, result),
      ],
    });
  }

  toModelToolChoice(request: OpenAIChatCompletionRequest): ModelToolChoice {
    const tc = request.tool_choice;
    if (tc === 'required') return ModelToolChoice.REQUIRED;
    // typeof null === 'object', and JSON can deliver null even though the
    // DTO type does not model it — guard explicitly.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, sonarjs/different-types-comparison
    if (tc !== null && typeof tc === 'object') {
      // Forward the named tool. Downstream provider converters
      // (openai-chat-message.converter.ts, anthropic-message.converter.ts)
      // treat any non-enum string as a tool name and emit a named-tool
      // tool_choice in the provider call.
      const fn = (tc as { function?: { name?: unknown } }).function;
      if (!fn || typeof fn.name !== 'string' || fn.name.length === 0) {
        throw new OpenAIInvalidRequestError(
          "tool_choice object must include a 'function.name' string",
        );
      }
      return fn.name as ModelToolChoice;
    }
    // 'auto' | 'none' | undefined → AUTO ('none' best-effort: tools are
    // still passed but model is told it's free to ignore them).
    return ModelToolChoice.AUTO;
  }

  /**
   * Map the OpenAI request's `tools` array into the inference port's
   * `ToolSchema[]` contract. The OpenAI surface is stateless and the client
   * owns execution, so we never construct domain `Tool` entities here — the
   * schema is all the LLM needs to be told the tool exists.
   */
  toToolSchemas(request: OpenAIChatCompletionRequest): ToolSchema[] {
    return (request.tools ?? []).map((t) => ({
      name: t.function.name,
      description: t.function.description ?? '',
      parameters: (t.function.parameters ?? {}) as JSONSchema,
    }));
  }

  newRequestId(): UUID {
    return randomUUID();
  }

  private extractTextContent(msg: OpenAIChatCompletionMessage): string {
    if (msg.content === undefined || msg.content === null) return '';
    if (typeof msg.content === 'string') return msg.content;
    // Many OpenAI-SDK clients always wrap content as an array of parts even
    // for plain text. Fold all text parts into a single string; reject only
    // genuinely unsupported modalities so connection tests pass. The DTO
    // doesn't deeply validate parts, so treat each as unknown at runtime.
    if (!Array.isArray(msg.content)) {
      throw new OpenAIInvalidRequestError(
        'message content must be a string or an array of content parts',
      );
    }
    const texts: string[] = [];
    for (const raw of msg.content as unknown[]) {
      if (raw === null || typeof raw !== 'object') {
        throw new OpenAIInvalidRequestError(
          'message content parts must be objects with a "type" field',
        );
      }
      const part = raw as { type?: unknown; text?: unknown };
      if (part.type === 'text') {
        if (typeof part.text !== 'string') {
          throw new OpenAIInvalidRequestError(
            'text content part must include a "text" string',
          );
        }
        texts.push(part.text);
      } else {
        throw new OpenAIInvalidRequestError(
          `message content part of type '${String(part.type)}' is not supported`,
        );
      }
    }
    return texts.join('');
  }

  private safeParseToolArgs(raw: string): Record<string, unknown> {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
}
