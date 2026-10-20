import { ApplicationError } from 'src/common/errors/base.error';
import { isCreditPolicyErrorCode } from 'src/domain/runs/application/credit-policy-error';
import {
  RunMaxIterationsReachedError,
  RunToolRepeatedlyFailingError,
  RunUsageAccountingFailedError,
} from 'src/domain/runs/application/runs.errors';
import { RunToolResultInput } from 'src/domain/runs/domain/run-input.entity';
import type { RunInput } from 'src/domain/runs/domain/run-input.entity';

/** Completed phases must remain because rollback would re-arm pending tool calls. */
export function shouldPreserveTranscript(
  error: unknown,
  input: RunInput,
): boolean {
  return (
    error instanceof RunMaxIterationsReachedError ||
    error instanceof RunToolRepeatedlyFailingError ||
    shouldPreserveRejectedTranscript(error, input)
  );
}

function shouldPreserveRejectedTranscript(
  error: unknown,
  input: RunInput,
): boolean {
  const rejection = findTranscriptPreservingRejection(error);
  if (!rejection) return false;
  if (input instanceof RunToolResultInput) return true;
  const modelTurn = rejection.metadata?.modelTurn;
  return typeof modelTurn === 'number' && modelTurn > 1;
}

function findTranscriptPreservingRejection(
  error: unknown,
): ApplicationError | undefined {
  if (!(error instanceof ApplicationError)) return undefined;
  if (
    isCreditPolicyErrorCode(error.code) ||
    error instanceof RunUsageAccountingFailedError
  ) {
    return error;
  }
  // A provider classification surfaced in place of a usage accounting
  // failure carries that failure as its cause.
  return error.cause instanceof RunUsageAccountingFailedError
    ? error.cause
    : undefined;
}
