import type { InferenceErrorInfo } from '../events/inference-completed.event';

/**
 * Extracts a status code from an unknown error object.
 * Provider SDKs (OpenAI, Anthropic) attach `status` or `statusCode` properties.
 */
function extractStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const record = error as Record<string, unknown>;
  if (typeof record['status'] === 'number') return record['status'];
  if (typeof record['statusCode'] === 'number') return record['statusCode'];
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
