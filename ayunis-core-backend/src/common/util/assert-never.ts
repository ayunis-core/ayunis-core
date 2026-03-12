export function assertNever(value: never): never {
  throw new Error(`Unhandled discriminant value: ${String(value)}`);
}
