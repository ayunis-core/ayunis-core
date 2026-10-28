const GENERATED_IMAGE_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function generatedImageIdFromToolResult(
  result: string | undefined,
): string | undefined {
  if (!result) {
    return undefined;
  }
  const firstLine = result.split('\n', 1)[0]?.trim() ?? '';
  if (GENERATED_IMAGE_ID.test(firstLine)) {
    return firstLine;
  }
  return result;
}
