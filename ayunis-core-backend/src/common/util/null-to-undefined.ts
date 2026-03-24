/**
 * class-transformer `@Transform` helper that converts `null` to `undefined`.
 *
 * Use on optional DTO fields whose TypeScript type is `T | undefined`
 * but where JSON payloads may send `null` (e.g. nullable DB columns
 * round-tripped through the frontend).
 */
export function nullToUndefined({ value }: { value: unknown }): unknown {
  return value === null ? undefined : value;
}
