/**
 * OpenAI only supports a subset of JSON Schema `format` values.
 * MCP servers often include unsupported formats (e.g. "uri", "uri-reference"),
 * which cause 400 errors from the OpenAI API. We strip any format not in the
 * supported set.
 *
 * @see https://platform.openai.com/docs/guides/structured-outputs#supported-schemas
 */
const OPENAI_SUPPORTED_FORMATS = new Set([
  'date-time',
  'time',
  'date',
  'duration',
  'email',
  'hostname',
  'ipv4',
  'ipv6',
  'uuid',
]);

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

  // Strip unsupported JSON Schema format values (e.g. "uri") that OpenAI rejects
  if (
    typeof normalized.format === 'string' &&
    !OPENAI_SUPPORTED_FORMATS.has(normalized.format)
  ) {
    delete normalized.format;
  }

  normalizeObjectType(normalized);
  normalizeProperties(normalized);
  normalizeArrayItems(normalized);

  return normalized;
}

function normalizeObjectType(schema: Record<string, unknown>): void {
  if (schema.type !== 'object') return;

  if (!('additionalProperties' in schema)) {
    schema.additionalProperties = false;
  }
  if (!('properties' in schema)) {
    schema.properties = {};
    schema.required = [];
  }
}

function normalizeProperties(schema: Record<string, unknown>): void {
  if (!schema.properties || typeof schema.properties !== 'object') return;

  const props = schema.properties as Record<string, Record<string, unknown>>;
  schema.properties = Object.fromEntries(
    Object.entries(props).map(([key, value]) => [
      key,
      normalizeSchemaForOpenAI(value),
    ]),
  );

  // OpenAI strict mode requires ALL properties to be required
  if (schema.type === 'object') {
    schema.required = Object.keys(props);
  }
}

function normalizeArrayItems(schema: Record<string, unknown>): void {
  if (!schema.items || typeof schema.items !== 'object') return;
  schema.items = normalizeSchemaForOpenAI(
    schema.items as Record<string, unknown>,
  );
}
