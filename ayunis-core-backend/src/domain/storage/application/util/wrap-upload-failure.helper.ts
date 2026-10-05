import { classifyTransportError } from 'src/common/errors/provider-transport-error.classifier';
import { extractUpstreamStatus } from 'src/common/errors/extract-upstream-status.helper';
import {
  StorageUnavailableError,
  UploadFailedError,
  type StorageFailureDiagnostics,
} from 'src/domain/storage/application/storage.errors';

// S3 error codes the server returns while it is overloaded, restarting, or
// otherwise temporarily unable to accept writes. Everything else (AccessDenied,
// NoSuchBucket, EntityTooLarge, ...) needs a config or code change, not a retry.
const TRANSIENT_S3_CODES = new Set([
  'SlowDown',
  'ServiceUnavailable',
  'InternalError',
  'RequestTimeout',
  'XMinioServerNotInitialized',
]);

const SAFE_DIAGNOSTIC_TOKEN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/;

/**
 * Classifies a raw object-storage upload failure. Transport failures, upstream
 * 5xx/408/429 responses, and known transient S3 codes become
 * StorageUnavailableError (503); everything else stays UploadFailedError (500).
 * Both carry only allowlisted name/code/status diagnostics — never the SDK
 * message, object path, or request id.
 */
export function wrapUploadFailure(
  error: unknown,
): UploadFailedError | StorageUnavailableError {
  const diagnostics = extractStorageFailureDiagnostics(error);
  return isTransientStorageFailure(error, diagnostics)
    ? new StorageUnavailableError({ diagnostics })
    : new UploadFailedError({ diagnostics });
}

function isTransientStorageFailure(
  error: unknown,
  diagnostics: StorageFailureDiagnostics | undefined,
): boolean {
  if (classifyTransportError(error)) return true;
  const status = diagnostics?.upstreamStatus;
  if (
    status !== undefined &&
    (status >= 500 || status === 408 || status === 429)
  ) {
    return true;
  }
  return TRANSIENT_S3_CODES.has(diagnostics?.upstreamCode ?? '');
}

function extractStorageFailureDiagnostics(
  error: unknown,
): StorageFailureDiagnostics | undefined {
  if (typeof error !== 'object' || error === null) return undefined;

  const record = error as Record<string, unknown>;
  const upstreamName = safeDiagnosticToken(record.name);
  const upstreamCode = safeDiagnosticToken(record.code);
  const upstreamStatus = extractUpstreamStatus(error);
  if (!upstreamName && !upstreamCode && upstreamStatus === undefined) {
    return undefined;
  }

  return {
    ...(upstreamName && { upstreamName }),
    ...(upstreamCode && { upstreamCode }),
    ...(upstreamStatus !== undefined && { upstreamStatus }),
  };
}

function safeDiagnosticToken(value: unknown): string | undefined {
  return typeof value === 'string' && SAFE_DIAGNOSTIC_TOKEN.test(value)
    ? value
    : undefined;
}
