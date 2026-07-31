import { isRecord } from './walk-schema';

/** Wider than JsonObject so consumers holding `Record<string, unknown>`
 * schemas (parsed third-party JSON) can call without casting. */
export type SchemaObject = Record<string, unknown>;

export type SchemaBranchResolver = (
  branch: unknown,
) => SchemaObject | undefined;

export interface SchemaAllowsNullOptions {
  /** Resolves a combinator branch to its schema (e.g. following `$ref`).
   * The default accepts inline object branches only. */
  resolveBranch?: SchemaBranchResolver;
  /** Treat OpenAPI-style `nullable: true` as allowing null. Strippers set
   * this (the tool's server honours the keyword); the strict normalizer must
   * not (OpenAI ignores it, so the property still needs a real hatch). */
  openApiNullable?: boolean;
}

const inlineBranch: SchemaBranchResolver = (branch) =>
  isRecord(branch) ? branch : undefined;

/**
 * Pragmatic "does this schema accept null?" shared by the strict-mode
 * normalizers (should an optional property still get a null escape hatch?)
 * and the null strippers (is a model-emitted null schema-legal?). A schema
 * with no value constraints at all permits null; implicit object/array
 * shapes (`properties`/`items` without `type`), `$ref`, and `not` are NOT
 * treated as unconstrained.
 */
export function schemaAllowsNull(
  schema: SchemaObject,
  options: SchemaAllowsNullOptions = {},
): boolean {
  return allows(schema, options, new Set());
}

function allows(
  schema: SchemaObject,
  options: SchemaAllowsNullOptions,
  seen: Set<unknown>,
): boolean {
  if (seen.has(schema)) {
    return false;
  }
  seen.add(schema);
  return (
    directAllows(schema, options) ??
    combinatorAllows(schema, options, seen) ??
    isUnconstrained(schema)
  );
}

/** Undefined when no direct (non-combinator) keyword decides. */
function directAllows(
  schema: SchemaObject,
  options: SchemaAllowsNullOptions,
): boolean | undefined {
  if (schema.type === 'null') {
    return true;
  }
  if (Array.isArray(schema.type) && schema.type.includes('null')) {
    return true;
  }
  if (options.openApiNullable === true && schema.nullable === true) {
    return true;
  }
  if (Array.isArray(schema.enum) && schema.enum.includes(null)) {
    return true;
  }
  if ('const' in schema) {
    return schema.const === null;
  }
  return undefined;
}

/** Undefined when the schema has no combinator to decide by. */
function combinatorAllows(
  schema: SchemaObject,
  options: SchemaAllowsNullOptions,
  seen: Set<unknown>,
): boolean | undefined {
  const resolve = options.resolveBranch ?? inlineBranch;
  const branchAllows = (branch: unknown): boolean => {
    const resolved = resolve(branch);
    return resolved !== undefined && allows(resolved, options, seen);
  };
  const some = [schema.anyOf, schema.oneOf].flatMap((value) =>
    Array.isArray(value) ? (value as unknown[]) : [],
  );
  if (some.some(branchAllows)) {
    return true;
  }
  if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    return schema.allOf.every(branchAllows);
  }
  return some.length > 0 ? false : undefined;
}

const CONSTRAINT_KEYS = [
  'type',
  'enum',
  'anyOf',
  'oneOf',
  'allOf',
  'not',
  'properties',
  'items',
  '$ref',
] as const;

function isUnconstrained(schema: SchemaObject): boolean {
  return CONSTRAINT_KEYS.every((key) => !(key in schema));
}
