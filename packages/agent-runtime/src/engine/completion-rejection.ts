import { MalformedToolCallError, ProviderError } from '../contracts/errors';
import type { ModelCallRejectedReason } from '../contracts/hook';
import type { ModelCallResult } from './accumulator';
import { hasAnswerOrToolUse } from './model-call-helpers';

interface CompletionRejection {
  readonly reason: ModelCallRejectedReason;
  readonly error: ProviderError;
}

export const terminalCompletionRejection = (
  result: ModelCallResult,
): CompletionRejection | undefined => {
  switch (result.finishReason) {
    case 'refusal':
      return {
        reason: 'refusal',
        error: new ProviderError('Model provider refused the response'),
      };
    case 'pause_turn':
      return {
        reason: 'pause_turn',
        error: new ProviderError(
          'Model provider paused the response; continuation is not supported',
        ),
      };
    case 'length':
      if (
        hasAnswerOrToolUse(result) ||
        result.invalidToolCallSnapshots.length > 0
      )
        return undefined;
      return {
        reason: 'output_limit',
        error: new ProviderError(
          'Model provider exhausted the output token limit without an answer',
        ),
      };
    case null:
    case 'stop':
    case 'tool_calls':
      return undefined;
  }
};

export const invalidFallbackError = (
  result: ModelCallResult,
): MalformedToolCallError =>
  new MalformedToolCallError(
    {
      toolNames: result.message.content
        .filter((content) => content.type === 'tool_use')
        .map((content) => content.name),
      reason: 'tool_disabled_fallback',
    },
    { usage: result.usage },
  );
