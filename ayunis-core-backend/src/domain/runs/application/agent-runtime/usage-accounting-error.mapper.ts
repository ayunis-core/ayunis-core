import type { RunEvent } from '@ayunis/agent-runtime';
import { RunUsageAccountingFailedError } from 'src/domain/runs/application/runs.errors';

type RunErrorEvent = Extract<RunEvent, { type: 'error' }>;

export function mapUsageAccountingError(
  event: RunErrorEvent,
): RunUsageAccountingFailedError | undefined {
  if (
    event.code !== 'HOOK_FAILED' ||
    event.details?.hookName !== 'ayunis-usage' ||
    event.details.phase !== 'afterModelCall'
  ) {
    return undefined;
  }
  return new RunUsageAccountingFailedError(event.modelCall?.turn);
}
