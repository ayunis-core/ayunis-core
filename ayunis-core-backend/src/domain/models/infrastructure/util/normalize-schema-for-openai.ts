/**
 * Recursively normalizes a JSON schema for OpenAI's strict mode.
 * OpenAI's strict mode requires:
 * 1. `additionalProperties: false` on all object schemas
 * 2. All properties must be listed in the `required` array
 *
 * @param schema - The JSON schema to normalize
 * @returns The normalized schema compatible with OpenAI strict mode
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

  // Add empty properties object if missing (OpenAI requires it)
  if (normalized.type === 'object' && !('properties' in normalized)) {
    normalized.properties = {};
    normalized.required = [];
  }

  // Recursively process properties
  if (normalized.properties && typeof normalized.properties === 'object') {
    const props = normalized.properties as Record<
      string,
      Record<string, unknown>
    >;

    // Normalize nested properties
    normalized.properties = Object.fromEntries(
      Object.entries(props).map(([key, value]) => [
        key,
        normalizeSchemaForOpenAI(value),
      ]),
    );

    // Ensure all properties are listed in required array
    // OpenAI strict mode requires ALL properties to be required
    if (normalized.type === 'object') {
      const propertyNames = Object.keys(props);
      normalized.required = propertyNames;
    }
  }

  // Handle array items
  if (normalized.items && typeof normalized.items === 'object') {
    normalized.items = normalizeSchemaForOpenAI(
      normalized.items as Record<string, unknown>,
    );
  }

  return normalized;
}
