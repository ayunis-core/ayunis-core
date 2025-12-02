/**
 * Recursively adds `additionalProperties: false` to all object types in a JSON schema.
 * OpenAI's strict mode requires this property to be set on all object schemas.
 *
 * @param schema - The JSON schema to normalize
 * @returns The normalized schema with `additionalProperties: false` added to all object types
 */
export function normalizeSchemaForOpenAI(
  schema: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!schema) return undefined;

  const normalized = { ...schema };

  // Add additionalProperties: false to object types if not already present
  if (normalized.type === 'object' && !('additionalProperties' in normalized)) {
    normalized.additionalProperties = false;
  }

  // Recursively process properties
  if (normalized.properties && typeof normalized.properties === 'object') {
    const props = normalized.properties as Record<
      string,
      Record<string, unknown>
    >;
    normalized.properties = Object.fromEntries(
      Object.entries(props).map(([key, value]) => [
        key,
        normalizeSchemaForOpenAI(value),
      ]),
    );
  }

  // Handle array items
  if (normalized.items && typeof normalized.items === 'object') {
    normalized.items = normalizeSchemaForOpenAI(
      normalized.items as Record<string, unknown>,
    );
  }

  return normalized;
}
