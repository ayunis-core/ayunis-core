import type {
  JsonObject,
  JsonSchema,
  JsonValue,
  MutableSchema,
} from '@ayunis/inference';
import {
  SchemaNormalizer,
  convertDraft04ExclusiveBoundsNode,
  isRecord,
} from '@ayunis/inference';

/** What the normalizer guarantees: a root object schema, as Anthropic requires. */
export type AnthropicInputSchema = JsonObject & { type: 'object' };

const TOP_LEVEL_COMBINATORS = ['oneOf', 'anyOf', 'allOf'] as const;

/**
 * Normalizes a tool's JSON schema for the Anthropic Messages API. MCP servers
 * emit schema shapes Anthropic rejects with a 400:
 * - a missing top-level `type: 'object'` (`input_schema.type: Field required`)
 * - draft-04 boolean `exclusiveMinimum`/`exclusiveMaximum` (must be draft 2020-12)
 * - tuple-form `items` arrays (draft 2020-12 expects a single schema)
 * - `oneOf`/`anyOf`/`allOf` at the top level of `input_schema`
 *
 * Only the wire format is normalized — tool-execution validation (ajv) keeps
 * running against the original schema.
 */
class AnthropicSchemaNormalizer extends SchemaNormalizer {
  protected visitNode(node: MutableSchema): MutableSchema {
    convertDraft04ExclusiveBoundsNode(node);
    return node;
  }

  protected visitRoot(root: MutableSchema): MutableSchema {
    flattenTopLevelCombinators(root);
    if (!('type' in root)) {
      root.type = 'object';
    }
    if (root.type === 'object' && !('properties' in root)) {
      root.properties = {};
    }
    return root;
  }
}

const normalizer = new AnthropicSchemaNormalizer();

export function normalizeSchemaForAnthropic(
  schema: JsonSchema | undefined,
): AnthropicInputSchema {
  if (!schema) return { type: 'object', properties: {} };
  const normalized = { ...normalizer.normalize(schema) };
  // visitRoot only defaults a MISSING type; a source schema may carry a
  // non-object one, and Anthropic accepts only object roots.
  normalized.type = 'object';
  return normalized as AnthropicInputSchema;
}

/**
 * Anthropic rejects `oneOf`/`anyOf`/`allOf` at the top level of
 * `input_schema`. Merge each branch's properties into the root instead; only
 * `allOf` branches keep their `required` entries (they all apply), while
 * `oneOf`/`anyOf` requirements are alternatives and are dropped.
 */
function flattenTopLevelCombinators(schema: MutableSchema): void {
  for (const combinator of TOP_LEVEL_COMBINATORS) {
    const branches = schema[combinator];
    if (!Array.isArray(branches)) continue;
    delete schema[combinator];
    mergeBranches(schema, branches, combinator === 'allOf');
  }
}

function mergeBranches(
  schema: MutableSchema,
  branches: JsonValue[],
  mergeRequired: boolean,
): void {
  const properties: JsonObject = isRecord(schema.properties)
    ? { ...schema.properties }
    : {};
  const required = new Set(asStringArray(schema.required));
  for (const branch of branches.filter(isRecord)) {
    mergeBranchProperties(properties, branch);
    if (mergeRequired) {
      asStringArray(branch.required).forEach((name) => required.add(name));
    }
  }
  schema.properties = properties;
  if (required.size > 0) {
    schema.required = [...required];
  }
}

function mergeBranchProperties(
  properties: JsonObject,
  branch: JsonObject,
): void {
  if (!isRecord(branch.properties)) return;
  for (const [name, child] of Object.entries(branch.properties)) {
    properties[name] ??= child;
  }
}

function asStringArray(value: JsonValue | undefined): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];
}
