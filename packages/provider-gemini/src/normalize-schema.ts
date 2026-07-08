import type { Schema } from '@google/genai';

import type { JsonSchema, MutableSchema } from '@ayunis/inference';
import { SchemaWalker } from '@ayunis/inference';

const GEMINI_SCHEMA_KEY_LIST = [
  'anyOf',
  'default',
  'description',
  'enum',
  'example',
  'format',
  'items',
  'maximum',
  'maxItems',
  'maxLength',
  'maxProperties',
  'minimum',
  'minItems',
  'minLength',
  'minProperties',
  'nullable',
  'pattern',
  'properties',
  'propertyOrdering',
  'required',
  'title',
  'type',
] as const satisfies readonly (keyof Schema)[];

const GEMINI_SCHEMA_KEYS: ReadonlySet<string> = new Set(GEMINI_SCHEMA_KEY_LIST);
const GEMINI_SUPPORTED_FORMATS = new Set([
  'date-time',
  'enum',
  'int32',
  'int64',
  'float',
  'double',
]);

const walker = new SchemaWalker((node) => {
  foldExclusiveBound(node, 'exclusiveMinimum', 'minimum');
  foldExclusiveBound(node, 'exclusiveMaximum', 'maximum');
  normalizeTypeArray(node);
  normalizeFormat(node);
  // Gemini rejects `properties` on nodes without an explicit OBJECT type
  // (common in MCP combinator branches).
  if ('properties' in node && !('type' in node)) {
    node.type = 'object';
  }
  if (Array.isArray(node.oneOf) && !('anyOf' in node)) {
    node.anyOf = node.oneOf;
  }

  return pickGeminiKeys(node);
});

// Gemini has no exclusive-bound keywords — fold both the draft-04 boolean and
// 2020-12 numeric forms into the inclusive bound (looser is fine; the tool
// validates its real inputs).
function foldExclusiveBound(
  schema: MutableSchema,
  exclusiveKey: 'exclusiveMinimum' | 'exclusiveMaximum',
  boundKey: 'minimum' | 'maximum',
): void {
  const exclusive = schema[exclusiveKey];
  if (typeof exclusive === 'number' && !(boundKey in schema)) {
    schema[boundKey] = exclusive;
  }
  delete schema[exclusiveKey];
}

function normalizeTypeArray(schema: MutableSchema): void {
  if (!Array.isArray(schema.type)) return;
  const types = schema.type.filter((t): t is string => typeof t === 'string');
  const nonNull = types.filter((t) => t !== 'null');
  if (nonNull.length !== types.length) {
    schema.nullable = true;
  }
  schema.type = nonNull[0] ?? 'string';
}

function normalizeFormat(schema: MutableSchema): void {
  if (
    typeof schema.format === 'string' &&
    !GEMINI_SUPPORTED_FORMATS.has(schema.format)
  ) {
    delete schema.format;
  }
}

function pickGeminiKeys(node: MutableSchema): MutableSchema {
  const picked: MutableSchema = {};
  for (const [key, value] of Object.entries(node)) {
    if (GEMINI_SCHEMA_KEYS.has(key)) {
      picked[key] = value;
    }
  }
  return picked;
}

export function normalizeSchemaForGemini(schema: JsonSchema): JsonSchema {
  return walker.walk(schema);
}
