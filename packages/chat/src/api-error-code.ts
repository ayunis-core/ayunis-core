/** The `code` of an API error response, e.g. `THREAD_NOT_FOUND`. */
export function apiErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const { response } = error as { response?: { data?: { code?: unknown } } };
  const code = response?.data?.code;
  return typeof code === 'string' ? code : undefined;
}
