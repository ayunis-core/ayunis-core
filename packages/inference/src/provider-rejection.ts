import { hasDiagnosticEvidence } from './provider-diagnostics';

/**
 * Why a provider rejected a request, for the rejections a host can act on.
 * Each provider recognises its own wording; the host never parses messages.
 */
export type ProviderRejectionReason =
  | 'context_length_exceeded'
  | 'content_filter'
  | 'invalid_tool_schema'
  | 'unsupported_parameter'
  | 'authentication_failed'
  | 'image_too_large';

export type ProviderRejectionClassifier = (
  error: unknown,
) => ProviderRejectionReason | undefined;

// Error codes OpenAI and Azure OpenAI document for these rejections; other
// OpenAI-compatible hosts reuse them.
const DIAGNOSTIC_REASONS: ReadonlyArray<
  readonly [ProviderRejectionReason, ReadonlySet<string>]
> = [
  ['context_length_exceeded', new Set(['context_length_exceeded'])],
  ['content_filter', new Set(['content_filter'])],
  ['invalid_tool_schema', new Set(['invalid_function_parameters'])],
  ['unsupported_parameter', new Set(['unsupported_parameter'])],
];

// 403 also covers region, policy and quota denials, so it only counts as an
// authentication failure next to a documented credential or permission code.
const AUTHENTICATION_DIAGNOSTICS: ReadonlySet<string> = new Set([
  'invalid_api_key',
  'authentication_error',
  'permission_error',
]);

export function resolveRejection(
  error: unknown,
  chain: readonly Record<string, unknown>[],
  status: number | undefined,
  providerClassifier: ProviderRejectionClassifier | undefined,
): ProviderRejectionReason | undefined {
  const providerReason = providerClassifier?.(error);
  if (providerReason) return providerReason;
  if (isAuthenticationFailure(status, chain)) return 'authentication_failed';
  return DIAGNOSTIC_REASONS.find(([, diagnostics]) =>
    hasDiagnosticEvidence(chain, diagnostics),
  )?.[0];
}

function isAuthenticationFailure(
  status: number | undefined,
  chain: readonly Record<string, unknown>[],
): boolean {
  if (status === 401) return true;
  return (
    status === 403 && hasDiagnosticEvidence(chain, AUTHENTICATION_DIAGNOSTICS)
  );
}
