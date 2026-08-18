import type { PinoLogger } from 'nestjs-pino';
import { safeJsonParse } from 'src/common/util/unicode-sanitizer';
import {
  InferenceMalformedToolCallError,
  InferenceTokenLimitError,
} from 'src/domain/models/application/models.errors';

export interface CompletedToolCall {
  id: string | null;
  name: string | null;
  arguments: string;
}

/**
 * Parses a completed tool call's arguments. Returns null when the payload
 * does not form a JSON object — callers must treat that as a corrupted
 * model response, never substitute `{}` (executing a guessed empty input
 * fails schema validation identically on every retry, which is the endless
 * document-creation loop of AYC-646). An empty payload stays `{}`: that is
 * the legitimate shape for tools without parameters.
 */
export function parseFinalToolArguments(
  args: string,
): Record<string, unknown> | null {
  if (!args) return {};
  const parsed: unknown = safeJsonParse(args, null);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  return parsed as Record<string, unknown>;
}

/**
 * Fails a successfully completed stream whose tool calls cannot be executed
 * faithfully: arguments that don't parse, or a token limit reached while a
 * call was still being emitted. Truncated text-only answers stay acceptable —
 * only tool calls must be intact, because their input is acted upon.
 */
export function assertToolCallArgumentsIntact(
  toolCalls: Iterable<CompletedToolCall>,
  finishReason: string | null,
  logger: PinoLogger,
): void {
  const calls = [...toolCalls].filter((call) => call.id && call.name);
  if (calls.length === 0) return;
  if (finishReason === 'length') {
    throw new InferenceTokenLimitError({
      toolNames: calls.map((call) => call.name),
    });
  }
  const malformed = calls.filter(
    (call) => parseFinalToolArguments(call.arguments) === null,
  );
  if (malformed.length === 0) return;
  // Only structural facts — the raw arguments carry user content, which must
  // not leave the run transcript for centralized logs. Length + finish reason
  // are enough to attribute the truncation (a token-limit cut shows up as
  // finishReason 'length' with a stable length across retries).
  logger.warn(
    {
      toolCalls: malformed.map((call) => ({
        toolName: call.name,
        argumentsLength: call.arguments.length,
      })),
      finishReason,
    },
    'Model emitted unparseable tool call arguments',
  );
  throw new InferenceMalformedToolCallError({
    toolNames: malformed.map((call) => call.name),
  });
}
