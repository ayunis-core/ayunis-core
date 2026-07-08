import type { JsonSchema, MutableSchema } from '@ayunis/inference';
import {
  SchemaNormalizer,
  convertDraft04ExclusiveBoundsNode,
} from '@ayunis/inference';

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
 * and draft-04 exclusive bounds are also converted or stripped.
 */
class OpenAISchemaNormalizer extends SchemaNormalizer {
  protected visitNode(node: MutableSchema): MutableSchema {
    if (
      typeof node.format === 'string' &&
      !OPENAI_SUPPORTED_FORMATS.has(node.format)
    ) {
      delete node.format;
    }
    convertDraft04ExclusiveBoundsNode(node);
    normalizeObjectType(node);
    return node;
  }
}

const normalizer = new OpenAISchemaNormalizer();

export function normalizeSchemaForOpenAI(
  schema: JsonSchema | undefined,
): JsonSchema | undefined {
  if (!schema) return undefined;
  return normalizer.normalize(schema);
}

/**
 * Strict mode treats any schema declaring `properties` as an object, even when
 * an explicit `type: 'object'` is omitted (common in MCP-style schemas).
 */
function isObjectSchema(schema: MutableSchema): boolean {
  return schema.type === 'object' || 'properties' in schema;
}

function normalizeObjectType(schema: MutableSchema): void {
  if (!isObjectSchema(schema)) return;
  // Strict mode requires additionalProperties:false on every object — force it
  // even when the source schema set it to `true`, which OpenAI rejects.
  schema.additionalProperties = false;
  if (schema.properties && typeof schema.properties === 'object') {
    // Strict mode requires every property to be listed in `required`.
    schema.required = Object.keys(schema.properties);
  } else {
    schema.properties = {};
    schema.required = [];
  }
}
