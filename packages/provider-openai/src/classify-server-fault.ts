/**
 * vLLM pins one structured-output backend (xgrammar or guidance) per engine on
 * the first strict request and rejects later requests whose schemas resolve to
 * the other one. That is engine state on the provider's side: the same request
 * can succeed on another engine, so it is a server fault, not our rejection
 * (AYC-1594).
 */
const STRUCTURED_OUTPUT_BACKEND_CONFLICT =
  /structured output processing only supports one backend per engine/i;

export function isOpenAICompatibleServerFault(error: unknown): boolean {
  return providerMessages(error).some((message) =>
    STRUCTURED_OUTPUT_BACKEND_CONFLICT.test(message),
  );
}

function providerMessages(error: unknown): string[] {
  const record = asRecord(error);
  const body = asRecord(record?.error);
  return [body?.message, record?.message].filter(
    (message): message is string => typeof message === 'string',
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}
