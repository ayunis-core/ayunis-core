import type { JsonSchema, MutableSchema } from '@ayunis/inference';
import {
  CombinatorFlattener,
  SchemaWalker,
  convertDraft04ExclusiveBoundsNode,
} from '@ayunis/inference';

// Hand-maintained — the SDK doesn't type them.
// https://platform.openai.com/docs/guides/structured-outputs#supported-schemas
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

const walker = new SchemaWalker((node) => {
  if (
    typeof node.format === 'string' &&
    !OPENAI_SUPPORTED_FORMATS.has(node.format)
  ) {
    delete node.format;
  }
  convertDraft04ExclusiveBoundsNode(node);
  normalizeObjectType(node);
  return node;
});

// Strict mode treats any schema declaring `properties` as an object, even when
// an explicit `type: 'object'` is omitted (common in MCP-style schemas).
function isObjectSchema(schema: MutableSchema): boolean {
  return schema.type === 'object' || 'properties' in schema;
}

function normalizeObjectType(schema: MutableSchema): void {
  if (!isObjectSchema(schema)) {
    return;
  }
  // Strict mode requires additionalProperties:false on every object — force it
  // even when the source schema set it to `true`, which OpenAI rejects.
  schema.additionalProperties = false;
  if (schema.properties && typeof schema.properties === 'object') {
    schema.required = Object.keys(schema.properties);
  } else {
    schema.properties = {};
    schema.required = [];
  }
}

export function normalizeSchemaForOpenAI(schema: JsonSchema): JsonSchema {
  const root = walker.walk(schema);
  new CombinatorFlattener(root).flatten();
  normalizeObjectType(root);

  return root;
}
