import { ApplicationError } from 'src/common/errors/base.error';

/**
 * Extracts the upstream HTTP status code from a provider SDK error.
 *
 * Different provider SDKs expose the status under different field names:
 *   - OpenAI / Anthropic:  error.status
 *   - older shapes:        error.statusCode
 *   - fetch-style:         error.response.status
 *   - AWS / Bedrock:       error.$metadata.httpStatusCode
 *
 * ApplicationError is excluded: its `statusCode` field describes the outbound
 * HTTP code our API returns, not anything the provider sent. Treating it as
 * upstream would misreport domain failures (validation, registry, quota) as
 * provider failures.
 *
 * Returns undefined if none of those fields hold a number, including for
 * non-object inputs and ApplicationError instances.
 */
export function extractUpstreamStatus(error: unknown): number | undefined {
  if (error instanceof ApplicationError) return undefined;
  if (typeof error !== 'object' || error === null) return undefined;
  const r = error as Record<string, unknown>;

  if (typeof r.status === 'number') return r.status;
  if (typeof r.statusCode === 'number') return r.statusCode;

  const response = r.response as { status?: unknown } | undefined;
  if (typeof response?.status === 'number') return response.status;

  const awsMeta = r.$metadata as { httpStatusCode?: unknown } | undefined;
  if (typeof awsMeta?.httpStatusCode === 'number')
    return awsMeta.httpStatusCode;

  return undefined;
}
