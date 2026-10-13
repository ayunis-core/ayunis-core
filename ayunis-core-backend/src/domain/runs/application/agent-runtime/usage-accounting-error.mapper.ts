import type { Logger } from '@nestjs/common';
import type { RunEvent } from '@ayunis/agent-runtime';
import type { ErrorMetadata } from 'src/common/errors/base.error';
import { hookFailureMetadata } from 'src/domain/runs/application/agent-runtime/runtime-hook-error';
import { RunUsageAccountingFailedError } from 'src/domain/runs/application/runs.errors';

type RunErrorEvent = Extract<RunEvent, { type: 'error' }>;

export function mapUsageAccountingError(
  event: RunErrorEvent,
  logger: Logger,
): RunUsageAccountingFailedError | undefined {
  if (
    event.code !== 'HOOK_FAILED' ||
    event.details?.hookName !== 'ayunis-usage' ||
    event.details.phase !== 'afterModelCall'
  ) {
    return undefined;
  }
  const metadata = {
    ...hookFailureMetadata(event.details),
    ...modelCallMetadata(event),
    ...providerFailureMetadata(event),
  };
  logger.error(
    { execution_path: 'agent_runtime', ...metadata, message: event.message },
    'Run usage accounting failed',
  );
  return new RunUsageAccountingFailedError(metadata);
}

function modelCallMetadata(event: RunErrorEvent): ErrorMetadata {
  if (!event.modelCall) return {};
  return {
    modelCallId: event.modelCall.modelCallId,
    modelTurn: event.modelCall.turn,
    callSequence: event.modelCall.callSequence,
    trigger: event.modelCall.trigger,
    provider: event.modelCall.provider,
  };
}

function providerFailureMetadata(event: RunErrorEvent): ErrorMetadata {
  if (!event.providerFailure) return {};
  return {
    providerFailureKind: event.providerFailure.kind,
    providerFailureStage: event.providerFailure.stage,
  };
}
