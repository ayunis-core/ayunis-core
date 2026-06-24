import type { JsonSchema } from '@ayunis/inference';

/**
 * OpenAI only supports a subset of JSON Schema `format` values; MCP servers
 * often emit unsupported ones (e.g. `uri`, `uri-reference`) that make the API
 * reject the request with a 400. Anything outside this set is stripped.
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
 * Normalizes a tool's JSON schema for OpenAI Chat Completions tools used with
 * `strict: true`. Strict mode requires `additionalProperties: false` on every
 * object and every property listed in `required`; unsupported `format` values
 * are also stripped. Recurses into properties and array items.
 */
export function normalizeSchemaForOpenAI(
  schema: Record<string, unknown> | undefined,
): JsonSchema | undefined {
  if (!schema) return undefined;

  const normalized = { ...schema };

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

/**
 * Strict mode treats any schema declaring `properties` as an object, even when
 * an explicit `type: 'object'` is omitted (common in MCP-style schemas).
 */
function isObjectSchema(schema: Record<string, unknown>): boolean {
  return schema.type === 'object' || 'properties' in schema;
}

function normalizeObjectType(schema: Record<string, unknown>): void {
  if (!isObjectSchema(schema)) return;
  // Strict mode requires additionalProperties:false on every object — force it
  // even when the source schema set it to `true`, which OpenAI rejects.
  schema.additionalProperties = false;
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

  // Strict mode requires every property to be listed in `required`. The
  // presence of `properties` is what marks this node as an object.
  schema.required = Object.keys(props);
}

function normalizeArrayItems(schema: Record<string, unknown>): void {
  if (!schema.items || typeof schema.items !== 'object') return;
  schema.items = normalizeSchemaForOpenAI(
    schema.items as Record<string, unknown>,
  );
}
