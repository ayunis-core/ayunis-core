export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

export function hasDiagnosticEvidence(
  chain: readonly Record<string, unknown>[],
  diagnostics: ReadonlySet<string>,
): boolean {
  return chain.some((record) => {
    const body = asRecord(record.error);
    const nestedBody = asRecord(body?.error);
    return [
      record.code,
      record.type,
      body?.code,
      body?.type,
      nestedBody?.code,
      nestedBody?.type,
    ].some((value) => typeof value === 'string' && diagnostics.has(value));
  });
}
