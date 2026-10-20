import type { RunEvent } from '@ayunis/agent-runtime';
import type { ErrorMetadata } from 'src/common/errors/base.error';
import { InferenceMalformedToolCallError } from 'src/domain/models/application/models.errors';
import type { RuntimeModelRegistry } from './runtime-model.registry';

type RunErrorEvent = Extract<RunEvent, { type: 'error' }>;

export function mapMalformedToolCallError(
  event: RunErrorEvent,
  models: RuntimeModelRegistry | undefined,
): InferenceMalformedToolCallError | undefined {
  if (event.code !== 'MALFORMED_TOOL_CALL') return undefined;
  const reason = event.details?.reason;
  const toolNames = event.details?.toolNames;
  return new InferenceMalformedToolCallError(
    typeof reason === 'string' ? reason : 'unparseable_arguments',
    {
      toolNames: Array.isArray(toolNames) ? toolNames : [],
      ...modelMetadata(event, models),
    },
  );
}

function modelMetadata(
  event: RunErrorEvent,
  models: RuntimeModelRegistry | undefined,
): ErrorMetadata {
  if (!event.modelCall || !models) return {};
  try {
    const model = models.resolveByProviderName(event.modelCall.provider);
    return { provider: model.provider, modelId: model.name };
  } catch {
    return {};
  }
}
