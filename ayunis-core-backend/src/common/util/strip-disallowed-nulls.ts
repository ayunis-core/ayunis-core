import { isRecord, schemaAllowsNull } from '@ayunis/inference';

/**
 * Removes null-valued params that the tool's schema does not allow to be
 * null. Strict-mode providers (OpenAI-compatible) force every property into
 * `required` and give optional ones a null escape hatch, so the model emits
 * explicit nulls for fields it wants to omit — forwarding those to the tool
 * (e.g. an external MCP server) would fail validation or corrupt the query.
 * Local `$ref` pointers and combinator wrappers (`anyOf`/`oneOf`/`allOf`,
 * Pydantic's `Optional[Model]` shape) are resolved so nulls inside nested
 * definitions are stripped too. Nulls the schema legitimately permits are
 * preserved. Returns the input object itself when nothing was stripped.
 */
export function stripDisallowedNulls(
  params: Record<string, unknown>,
  schema: unknown,
): Record<string, unknown> {
  if (!isRecord(schema)) {
    return params;
  }
  return stripObject(params, schema, schema);
}

function stripObject(
  params: Record<string, unknown>,
  schema: unknown,
  root: Record<string, unknown>,
): Record<string, unknown> {
  const objectShape = resolveValueShape(schema, root, 'properties');
  const properties = objectShape?.properties;
  if (!isRecord(properties)) {
    return params;
  }
  const kept: [string, unknown][] = [];
  let changed = false;
  for (const [key, value] of Object.entries(params)) {
    const propSchema = resolveRef(properties[key], root);
    if (value === null && propSchema && !allowsNull(propSchema, root)) {
      changed = true;
      continue;
    }
    const stripped = stripNested(value, propSchema, root);
    changed ||= stripped !== value;
    kept.push([key, stripped]);
  }
  // fromEntries defines own properties, so a `__proto__` key in model output
  // stays inert data instead of replacing the result's prototype (which
  // bracket assignment would do, letting reads of absent fields resolve to
  // model-controlled values).
  return changed ? Object.fromEntries(kept) : params;
}

function stripNested(
  value: unknown,
  schema: unknown,
  root: Record<string, unknown>,
): unknown {
  if (schema === undefined) {
    return value;
  }
  if (isRecord(value)) {
    return stripObject(value, schema, root);
  }
  if (Array.isArray(value)) {
    return stripArrayElements(value, schema, root);
  }
  return value;
}

function stripArrayElements(
  elements: unknown[],
  schema: unknown,
  root: Record<string, unknown>,
): unknown[] {
  const arrayShape = resolveValueShape(schema, root, 'items');
  const items = arrayShape?.items;
  // Tuple-form `items` carries per-index schemas — no single element schema
  // to strip against.
  if (items === undefined || Array.isArray(items)) {
    return elements;
  }
  const stripped = elements.map((element) => stripNested(element, items, root));
  return stripped.every((element, index) => element === elements[index])
    ? elements
    : stripped;
}

/**
 * Resolves the schema node that actually describes an object (`properties`)
 * or array (`items`) value, descending through `$ref`s and combinator
 * branches. Ambiguity — multiple candidate branches — returns undefined:
 * leaving params untouched beats stripping against the wrong branch.
 */
function resolveValueShape(
  schema: unknown,
  root: Record<string, unknown>,
  shapeKey: 'properties' | 'items',
): Record<string, unknown> | undefined {
  const matches: Record<string, unknown>[] = [];
  const queue: unknown[] = [schema];
  const seen = new Set<unknown>();
  while (queue.length > 0) {
    const node = resolveRef(queue.shift(), root);
    if (!node || seen.has(node)) {
      continue;
    }
    seen.add(node);
    if (node[shapeKey] !== undefined) {
      matches.push(node);
      continue;
    }
    queue.push(...combinatorBranches(node));
  }
  return matches.length === 1 ? matches[0] : undefined;
}

function combinatorBranches(schema: Record<string, unknown>): unknown[] {
  return [schema.anyOf, schema.oneOf, schema.allOf].flatMap((value) =>
    Array.isArray(value) ? (value as unknown[]) : [],
  );
}

// Follows local `$ref` chains to the actual schema node; returns undefined
// for unresolvable or circular refs (broken schemas pass values through
// untouched) and for non-record schemas.
function resolveRef(
  schema: unknown,
  root: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const seen = new Set<string>();
  let current = schema;
  while (isRecord(current) && typeof current.$ref === 'string') {
    if (seen.has(current.$ref)) {
      return undefined;
    }
    seen.add(current.$ref);
    current = resolvePointer(current.$ref, root);
  }
  return isRecord(current) ? current : undefined;
}

function resolvePointer(ref: string, root: Record<string, unknown>): unknown {
  if (ref === '#') {
    return root;
  }
  if (!ref.startsWith('#/')) {
    return undefined;
  }
  let node: unknown = root;
  for (const segment of ref.slice(2).split('/')) {
    if (!isRecord(node)) {
      return undefined;
    }
    node = node[segment.replaceAll('~1', '/').replaceAll('~0', '~')];
  }
  return node;
}

function allowsNull(
  schema: Record<string, unknown>,
  root: Record<string, unknown>,
): boolean {
  return schemaAllowsNull(schema, {
    resolveBranch: (branch) => resolveRef(branch, root),
    openApiNullable: true,
  });
}
