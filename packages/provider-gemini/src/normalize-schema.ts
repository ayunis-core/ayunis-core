import type { Schema } from '@google/genai';

import type {
  JsonObject,
  JsonSchema,
  JsonValue,
  MutableSchema,
} from '@ayunis/inference';
import { SchemaWalker, isRecord } from '@ayunis/inference';

import { dereferenceLocalRefs } from './dereference-refs';

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
  mergeAllOf(node);
  foldExclusiveBound(node, 'exclusiveMinimum', 'minimum');
  foldExclusiveBound(node, 'exclusiveMaximum', 'maximum');
  normalizeTypeUnion(node);
  normalizeFormat(node);
  // Gemini rejects `properties` on nodes without an explicit OBJECT type
  // (common in MCP combinator branches).
  if ('properties' in node && !('type' in node)) {
    node.type = 'object';
  }
  // Gemini cannot conjoin two unions (no allOf) — concatenate instead:
  // looser, but every branch stays visible to the model.
  if (Array.isArray(node.oneOf)) {
    node.anyOf = [
      ...(Array.isArray(node.anyOf) ? node.anyOf : []),
      ...node.oneOf,
    ];
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

// Gemini has no allOf — merge every branch (and any allOf nested within a
// branch) into the node itself. The node's own values win, `required` is
// the union of all branches (they all apply).
function mergeAllOf(node: MutableSchema): void {
  for (const branch of collectAllOfBranches(node.allOf)) {
    mergeBranch(node, branch);
  }
  delete node.allOf;
}

function collectAllOfBranches(allOf: JsonValue | undefined): JsonObject[] {
  if (!Array.isArray(allOf)) return [];
  return allOf
    .filter(isRecord)
    .flatMap((branch) => [branch, ...collectAllOfBranches(branch.allOf)]);
}

const SEPARATELY_MERGED_KEYS = new Set(['allOf', 'properties', 'required']);

function mergeBranch(node: MutableSchema, branch: JsonObject): void {
  mergeProperties(node, branch.properties);
  mergeRequired(node, branch.required);
  for (const [key, value] of Object.entries(branch)) {
    if (!SEPARATELY_MERGED_KEYS.has(key)) {
      node[key] ??= value;
    }
  }
}

function mergeProperties(node: MutableSchema, props: JsonValue): void {
  if (!isRecord(props)) return;
  // Copied before merging — branch objects belong to the caller's input.
  const merged = isRecord(node.properties) ? { ...node.properties } : {};
  for (const [name, prop] of Object.entries(props)) {
    merged[name] ??= prop;
  }
  node.properties = merged;
}

function mergeRequired(node: MutableSchema, required: JsonValue): void {
  const names = [...asStringArray(node.required), ...asStringArray(required)];
  if (names.length > 0) {
    node.required = [...new Set(names)];
  }
}

function asStringArray(value: JsonValue | undefined): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];
}

function normalizeTypeUnion(schema: MutableSchema): void {
  if (!Array.isArray(schema.type)) return;
  const types = schema.type.filter((t): t is string => typeof t === 'string');
  const nonNull = types.filter((t) => t !== 'null');
  if (nonNull.length !== types.length) {
    schema.nullable = true;
  }
  // Gemini's `type` is single-valued; a real union becomes anyOf branches.
  if (nonNull.length > 1 && !('anyOf' in schema)) {
    delete schema.type;
    schema.anyOf = nonNull.map((type) => ({ type }));
    return;
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
  // Wire data is JSON, so its values are JsonValue by construction.
  return walker.walk(dereferenceLocalRefs(schema as MutableSchema));
}
