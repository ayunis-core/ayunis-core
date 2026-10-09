const POSTGRES_UNAVAILABLE_CODES = new Set([
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '08007',
  '57P01',
  '57P02',
  '57P03',
]);

const CONNECTION_UNAVAILABLE_CODES = new Set([
  'EAI_AGAIN',
  'ECONNABORTED',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'EPIPE',
  'ETIMEDOUT',
]);

export function isDatabaseUnavailableError(error: unknown): boolean {
  const queue = [error];
  const visited = new Set<object>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!isRecord(current) || visited.has(current)) continue;
    visited.add(current);

    if (isUnavailableCode(current.code)) return true;
    queue.push(
      current.cause,
      current.driverError,
      current.error,
      current.metadata,
    );
    if (Array.isArray(current.errors)) {
      for (const nestedError of current.errors as unknown[]) {
        queue.push(nestedError);
      }
    }
  }

  return false;
}

function isUnavailableCode(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    (POSTGRES_UNAVAILABLE_CODES.has(value) ||
      CONNECTION_UNAVAILABLE_CODES.has(value))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
