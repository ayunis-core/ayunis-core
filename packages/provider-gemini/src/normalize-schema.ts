import type { Schema } from '@google/genai';

import type { JsonSchema, MutableSchema } from '@ayunis/inference';
import { SchemaNormalizer } from '@ayunis/inference';

/**
 * Gemini function declarations accept only an OpenAPI-style subset of JSON
 * Schema (see `Schema` in `@google/genai`) and reject requests containing
 * unknown fields with a 400 ("Unknown name ... Cannot find field"). MCP
 * servers emit full JSON Schema, so everything outside the subset is dropped
 * and near-miss keywords are folded into supported equivalents.
 */
// `satisfies` pins every entry to a real field of the SDK's Schema type —
// if Google drops one, this fails to compile instead of producing 400s.
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

/** Formats Gemini accepts; anything else (uri, email, uuid, …) 400s. */
const GEMINI_SUPPORTED_FORMATS = new Set([
  'date-time',
  'enum',
  'int32',
  'int64',
  'float',
  'double',
]);

class GeminiSchemaNormalizer extends SchemaNormalizer {
  protected visitNode(node: MutableSchema): MutableSchema {
    foldExclusiveBound(node, 'exclusiveMinimum', 'minimum');
    foldExclusiveBound(node, 'exclusiveMaximum', 'maximum');
    normalizeTypeArray(node);
    normalizeFormat(node);
    if (Array.isArray(node.oneOf) && !('anyOf' in node)) {
      node.anyOf = node.oneOf;
    }
    return pickGeminiKeys(node);
  }
}

const normalizer = new GeminiSchemaNormalizer();

export function normalizeSchemaForGemini(schema: JsonSchema): JsonSchema {
  return normalizer.normalize(schema);
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

/**
 * Gemini has no exclusive-bound keywords at all — fold both the draft-04
 * boolean form and the 2020-12 numeric form into the inclusive bound
 * (slightly looser, but the tool validates its own inputs anyway).
 */
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
