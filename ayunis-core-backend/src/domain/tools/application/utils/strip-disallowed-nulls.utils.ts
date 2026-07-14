/**
 * Removes null-valued params that the tool's schema does not allow to be
 * null. Strict-mode providers (OpenAI-compatible) force every property into
 * `required` and give optional ones a null escape hatch, so the model emits
 * explicit nulls for fields it wants to omit — forwarding those to the tool
 * (e.g. an external MCP server) would fail validation or corrupt the query.
 */
export function stripDisallowedNulls(
  params: Record<string, unknown>,
  schema: unknown,
): Record<string, unknown> {
  if (!isRecord(schema) || !isRecord(schema.properties)) {
    return params;
  }
  const properties = schema.properties;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    const propSchema = properties[key];
    if (value === null && isRecord(propSchema) && !allowsNull(propSchema)) {
      continue;
    }
    result[key] = stripNested(value, propSchema);
  }
  return result;
}

function stripNested(value: unknown, propSchema: unknown): unknown {
  if (!isRecord(propSchema)) {
    return value;
  }
  if (isRecord(value)) {
    return stripDisallowedNulls(value, propSchema);
  }
  if (Array.isArray(value) && isRecord(propSchema.items)) {
    const items = propSchema.items;
    const elements: unknown[] = value;
    return elements.map((element) =>
      isRecord(element) ? stripDisallowedNulls(element, items) : element,
    );
  }
  return value;
}

function allowsNull(schema: Record<string, unknown>): boolean {
  if (schema.type === 'null') {
    return true;
  }
  if (Array.isArray(schema.type) && schema.type.includes('null')) {
    return true;
  }
  if (Array.isArray(schema.enum) && schema.enum.includes(null)) {
    return true;
  }
  return (
    Array.isArray(schema.anyOf) &&
    schema.anyOf.some((branch) => isRecord(branch) && allowsNull(branch))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
