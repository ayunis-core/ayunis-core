import type { JsonObject } from './json-value';

/** Exclusive-bound keyword → the inclusive bound it qualifies in draft-04. */
const BOUND_FOR = {
  exclusiveMinimum: 'minimum',
  exclusiveMaximum: 'maximum',
} as const;

/**
 * Draft-04 JSON Schema expressed exclusive bounds as booleans qualifying
 * `minimum` / `maximum`; draft 2020-12 expects the numeric bound itself.
 * MCP servers still emit the draft-04 form, which LLM provider APIs reject.
 * Converts both bounds on a single schema node, in place.
 */
export function convertDraft04ExclusiveBoundsNode(node: JsonObject): void {
  convertBound(node, 'exclusiveMinimum');
  convertBound(node, 'exclusiveMaximum');
}

function convertBound(
  schema: JsonObject,
  exclusiveKey: keyof typeof BOUND_FOR,
): void {
  const boundKey = BOUND_FOR[exclusiveKey];
  const exclusive = schema[exclusiveKey];
  if (typeof exclusive !== 'boolean') return;
  if (exclusive && typeof schema[boundKey] === 'number') {
    schema[exclusiveKey] = schema[boundKey];
    delete schema[boundKey];
  } else {
    delete schema[exclusiveKey];
  }
}
