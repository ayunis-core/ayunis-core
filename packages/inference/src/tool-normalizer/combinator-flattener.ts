import type { JsonObject, JsonValue } from './json-value';
import type { MutableSchema } from './walk-schema';
import { DEFS_KEYS, isRecord } from './walk-schema';

const COMBINATOR_KEYS = ['oneOf', 'anyOf', 'allOf'] as const;

type DefsKey = (typeof DEFS_KEYS)[number];

// Merges top-level `oneOf`/`anyOf`/`allOf` branches into the root, for
// providers that reject combinators there (Anthropic, OpenAI strict mode).
// Only `allOf` keeps `required` (its branches all apply); `oneOf`/`anyOf`
// requirements are alternatives and are dropped.
export class CombinatorFlattener {
  private readonly properties: JsonObject;
  private readonly required: Set<string>;
  private readonly defs: Record<DefsKey, JsonObject>;

  constructor(private readonly root: MutableSchema) {
    this.properties = isRecord(root.properties) ? { ...root.properties } : {};
    this.required = new Set(asStringArray(root.required));
    // Seeded from the root so branch defs merge first-wins against it —
    // a branch must never rewire what the root's `$ref`s resolve to.
    this.defs = {
      $defs: { ...asObject(root.$defs) },
      definitions: { ...asObject(root.definitions) },
    };
  }

  flatten(): void {
    let flattened = false;
    for (const combinator of COMBINATOR_KEYS) {
      const branches = this.root[combinator];
      if (!Array.isArray(branches)) continue;
      delete this.root[combinator];
      flattened = true;
      for (const branch of branches.filter(isRecord)) {
        this.collect(branch, combinator === 'allOf');
      }
    }
    if (flattened) this.writeBack();
  }

  // Descends through combinators nested inside a branch so params and their
  // definitions are never silently dropped; `required` only propagates
  // through further `allOf` nesting.
  private collect(branch: JsonObject, mergeRequired: boolean): void {
    mergeFirstWins(this.properties, branch.properties);
    for (const key of DEFS_KEYS) {
      mergeFirstWins(this.defs[key], branch[key]);
    }
    if (mergeRequired) {
      asStringArray(branch.required).forEach((name) => this.required.add(name));
    }
    for (const combinator of COMBINATOR_KEYS) {
      const nested = branch[combinator];
      if (!Array.isArray(nested)) continue;
      for (const child of nested.filter(isRecord)) {
        this.collect(child, mergeRequired && combinator === 'allOf');
      }
    }
  }

  private writeBack(): void {
    this.root.properties = this.properties;
    if (this.required.size > 0) {
      this.root.required = [...this.required];
    }
    // Keep each defs collection under its original key so `$ref` paths
    // (`#/$defs/…` vs `#/definitions/…`) still resolve.
    for (const key of DEFS_KEYS) {
      if (Object.keys(this.defs[key]).length > 0) {
        this.root[key] = this.defs[key];
      }
    }
  }
}

// Copies `source`'s entries into `target`, keeping any existing key.
function mergeFirstWins(
  target: JsonObject,
  source: JsonValue | undefined,
): void {
  if (!isRecord(source)) return;
  for (const [name, value] of Object.entries(source)) {
    target[name] ??= value;
  }
}

function asObject(value: JsonValue | undefined): JsonObject {
  return isRecord(value) ? value : {};
}

function asStringArray(value: JsonValue | undefined): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];
}
