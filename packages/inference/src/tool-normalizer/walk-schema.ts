import type { JsonObject, JsonValue } from './json-value';
import type { JsonSchema } from '../tool-schema';

export type MutableSchema = JsonObject;
export type VisitNode = (node: MutableSchema) => MutableSchema; // Receives a fresh shallow copy of a schema node — mutate and return it.

// Keys holding reusable sub-schema definitions `$ref` may point at. The walk
// must descend into every key the flattener hoists, so both derive from this.
export const DEFS_KEYS = ['$defs', 'definitions'] as const;
const SCHEMA_MAP_KEYS = new Set(['properties', ...DEFS_KEYS]);
const OPAQUE_VALUE_KEYS = new Set(['default', 'example', 'const', 'enum']);

// Recursively applies a provider's per-node rule to a JSON schema without
// mutating the input. Collapses draft-04/-07 tuple-form `items` on the way,
// since no provider accepts an array there.
export class SchemaWalker {
  constructor(private readonly visitNode: VisitNode) {}

  walk(schema: JsonSchema): JsonObject {
    // Wire data is JSON, so its values are JsonValue by construction.
    return this.walkNode(schema as MutableSchema);
  }

  private walkNode(input: Readonly<MutableSchema>): MutableSchema {
    const node = this.visitNode({ ...input });
    // `additionalItems` only qualifies tuple validation, which collapses below.
    if (Array.isArray(node.items)) delete node.additionalItems;
    for (const [key, value] of Object.entries(node)) {
      node[key] = this.walkValue(key, value);
    }
    return node;
  }

  private walkValue(key: string, value: JsonValue): JsonValue {
    if (OPAQUE_VALUE_KEYS.has(key)) {
      return value;
    }

    let walked: JsonValue = value;
    if (SCHEMA_MAP_KEYS.has(key) && isRecord(value)) {
      walked = mapValues(value, (child) =>
        isRecord(child) ? this.walkNode(child) : child,
      );
    } else if (key === 'items' && Array.isArray(value)) {
      walked = { anyOf: this.walkEntries(value) };
    } else if (Array.isArray(value)) {
      walked = this.walkEntries(value);
    } else if (isRecord(value)) {
      walked = this.walkNode(value);
    }
    return walked;
  }

  private walkEntries(entries: JsonValue[]): JsonValue[] {
    return entries.map((entry) =>
      isRecord(entry) ? this.walkNode(entry) : entry,
    );
  }
}

function mapValues(
  obj: JsonObject,
  fn: (value: JsonValue) => JsonValue,
): JsonObject {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, fn(value)]),
  );
}

export function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
