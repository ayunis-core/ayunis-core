import type { JsonObject, JsonValue } from './json-value';
import type { JsonSchema } from '../tool-schema';

export type MutableSchema = JsonObject;

const SCHEMA_MAP_KEYS = new Set(['properties', '$defs', 'definitions']);

/** Keys carrying data values, not sub-schemas — never descended into. */
const OPAQUE_VALUE_KEYS = new Set(['default', 'example', 'const', 'enum']);

/**
 * Template for provider schema normalizers. MCP servers emit full JSON
 * Schema, and each LLM provider rejects a different subset of it — but the
 * recursive walk over a schema is identical everywhere. The base class owns
 * that walk (including collapsing draft-04/-07 tuple-form `items`, which no
 * provider accepts) and never mutates the input; subclasses supply per-node
 * and root-only rules.
 */
export abstract class SchemaNormalizer {
  normalize(schema: JsonSchema): JsonSchema {
    // Schemas arrive from JSON (MCP wire format), so their values are
    // JsonValue by construction — assert once here instead of per node.
    return this.visitRoot(this.walk(schema as MutableSchema));
  }

  /** Per-node rules. Receives a fresh shallow copy — mutate and return it. */
  protected abstract visitNode(node: MutableSchema): MutableSchema;

  /** Root-only rules (top-level constraints). */
  protected visitRoot(root: MutableSchema): MutableSchema {
    return root;
  }

  private walk(schema: Readonly<MutableSchema>): MutableSchema {
    const node = this.visitNode({ ...schema });
    if (Array.isArray(node.items)) {
      // `anyOf` replaces the per-index semantics additionalItems qualified.
      delete node.additionalItems;
    }
    for (const [key, value] of Object.entries(node)) {
      node[key] = this.walkValue(key, value);
    }
    return node;
  }

  // A JSON value is inherently a union — the walk preserves each input's shape.
  // eslint-disable-next-line sonarjs/function-return-type
  private walkValue(key: string, value: JsonValue): JsonValue {
    if (OPAQUE_VALUE_KEYS.has(key)) {
      return value;
    }
    if (SCHEMA_MAP_KEYS.has(key) && isRecord(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([name, child]) => [
          name,
          isRecord(child) ? this.walk(child) : child,
        ]),
      );
    }
    // Tuple-form items (draft-04/-07 array syntax): providers expect a
    // single schema, so collapse the tuple into one anyOf schema — looser
    // than positional validation, but the tool validates its real inputs.
    if (key === 'items' && Array.isArray(value)) {
      return {
        anyOf: value.map((entry) =>
          isRecord(entry) ? this.walk(entry) : entry,
        ),
      };
    }
    if (Array.isArray(value)) {
      return value.map((entry) => (isRecord(entry) ? this.walk(entry) : entry));
    }
    if (isRecord(value) && key !== 'properties') {
      return this.walk(value);
    }
    return value;
  }
}

export function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
