import { ApplicationError } from 'src/common/errors/base.error';
import type { InferenceErrorInfo } from '../events/inference-completed.event';

/**
 * Extracts the upstream HTTP status code from a caught inference error.
 *
 * `InferenceFailedError` (an `ApplicationError`) has its own `statusCode`
 * field set to 500 — the HTTP code we map to, not the upstream provider's
 * status. To recover the upstream status we look in `metadata.status` first
 * (where `Get/StreamInferenceUseCase` stash it when wrapping), then fall back
 * to provider-SDK shapes for any path that bypasses the use-case wrapper.
 *
 * For any other `ApplicationError` (registry, validation, quota, etc.) we
 * deliberately ignore `.statusCode` — it would otherwise be reported as if
 * the provider had returned that code.
 */
function extractStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const r = error as Record<string, unknown>;

  const metadata = r.metadata as { status?: unknown } | undefined;
  if (typeof metadata?.status === 'number') return metadata.status;

  if (error instanceof ApplicationError) return undefined;

  if (typeof r.status === 'number') return r.status;
  if (typeof r.statusCode === 'number') return r.statusCode;

  const response = r.response as { status?: unknown } | undefined;
  if (typeof response?.status === 'number') return response.status;

  const awsMeta = r.$metadata as { httpStatusCode?: unknown } | undefined;
  if (typeof awsMeta?.httpStatusCode === 'number')
    return awsMeta.httpStatusCode;

  return undefined;
}

/**
 * Builds an {@link InferenceErrorInfo} from an unknown caught error.
 * Handles Error instances, objects with a `message` property, and
 * arbitrary non-Error exceptions (stringified).
 */
export function extractInferenceErrorInfo(error: unknown): InferenceErrorInfo {
  if (error instanceof Error) {
    return {
      message: error.message,
      statusCode: extractStatusCode(error),
    };
  }

  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    const message =
      typeof record['message'] === 'string'
        ? record['message']
        : JSON.stringify(error);
    return {
      message,
      statusCode: extractStatusCode(error),
    };
  }

  return { message: String(error) };
}
