import type { JsonObject, JsonValue } from '@ayunis/inference';
import { isRecord } from '@ayunis/inference';

const DEFS_KEYS = new Set(['$defs', 'definitions']);

// Acyclic ref DAGs can expand exponentially when inlined (each def
// referencing the previous one twice doubles the output per level — the
// "billion laughs" shape). Schemas come from third-party MCP servers, so
// expansion is budgeted; past the cap refs degrade to permissive schemas.
const MAX_REF_EXPANSIONS = 1000;

interface ResolveState {
  readonly root: JsonObject;
  expansions: number;
}

// Inlines local `$ref` pointers (`#/…`) — Gemini's schema subset has no
// reference support, so refs must expand before pruning or the referenced
// parameters vanish. Cycles are cut to an empty (permissive) schema; the
// tool validates its real inputs.
export function dereferenceLocalRefs(root: JsonObject): JsonObject {
  const state: ResolveState = { root, expansions: 0 };
  const resolved = resolveValue(root, state, new Set());
  return isRecord(resolved) ? resolved : root;
}

function resolveValue(
  value: JsonValue,
  state: ResolveState,
  stack: ReadonlySet<string>,
): JsonValue {
  let resolved: JsonValue = value;
  if (Array.isArray(value)) {
    resolved = value.map((entry) => resolveValue(entry, state, stack));
  } else if (isRecord(value)) {
    resolved = resolveNode(value, state, stack);
  }
  return resolved;
}

function resolveNode(
  node: JsonObject,
  state: ResolveState,
  stack: ReadonlySet<string>,
): JsonValue {
  const { $ref, ...rest } = node;
  const siblings: JsonObject = {};
  for (const [key, value] of Object.entries(rest)) {
    // Defs are only read through refs and pruned later — no need to descend.
    siblings[key] = DEFS_KEYS.has(key)
      ? value
      : resolveValue(value, state, stack);
  }
  return inlineRef($ref, siblings, state, stack);
}

function inlineRef(
  $ref: JsonValue | undefined,
  siblings: JsonObject,
  state: ResolveState,
  stack: ReadonlySet<string>,
): JsonValue {
  let result: JsonValue = siblings;
  if (
    typeof $ref === 'string' &&
    !stack.has($ref) &&
    state.expansions < MAX_REF_EXPANSIONS
  ) {
    const target = lookupPointer(state.root, $ref);
    if (target !== undefined) {
      state.expansions += 1;
      const inlined = resolveValue(target, state, new Set([...stack, $ref]));
      // Sibling keys next to `$ref` override the referenced schema.
      result = isRecord(inlined) ? { ...inlined, ...siblings } : inlined;
    }
  }
  return result;
}

function lookupPointer(root: JsonObject, ref: string): JsonValue | undefined {
  if (!ref.startsWith('#/')) {
    return undefined;
  }
  let current: JsonValue | undefined = root;
  for (const segment of ref.slice(2).split('/')) {
    const key = segment.replaceAll('~1', '/').replaceAll('~0', '~');
    if (Array.isArray(current)) {
      current = current[Number(key)];
    } else if (isRecord(current)) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  return current;
}
