import type { ErrorObject } from 'ajv';
import { createAjv } from './ajv.factory';

/**
 * Validates tool-call params against a tool's JSON schema and throws with a
 * message the calling model can act on ("missing required parameter 'title'").
 * Raw ajv error JSON is deliberately not exposed: the message is fed back to
 * the model as the tool result, and an unactionable one makes the model retry
 * the identical broken call (AYC-646).
 */
// `boolean` is part of the JSON Schema grammar (json-schema-to-ts's
// JSONSchema union), so tool entities can pass `this.parameters` directly.
export function validateToolParams<T = Record<string, unknown>>(
  schema: object | boolean,
  params: Record<string, unknown>,
): T {
  const ajv = createAjv({ allErrors: true });
  const validate = ajv.compile(schema);
  if (!validate(params)) {
    throw new Error(formatAjvErrors(validate.errors ?? []));
  }
  return params as unknown as T;
}

export function formatAjvErrors(errors: readonly ErrorObject[]): string {
  if (errors.length === 0) {
    return 'Invalid parameters';
  }
  return `Invalid parameters: ${errors.map(formatAjvError).join('; ')}`;
}

function formatAjvError(error: ErrorObject): string {
  const path = dotPath(error.instancePath) || '(root)';
  switch (error.keyword) {
    case 'required':
      return `missing required parameter '${joinPath(dotPath(error.instancePath), error.params.missingProperty)}'`;
    case 'additionalProperties':
      return `unknown parameter '${joinPath(dotPath(error.instancePath), error.params.additionalProperty)}'`;
    case 'type':
      return `parameter '${path}' must be of type ${String(error.params.type)}`;
    case 'enum':
      return `parameter '${path}' must be one of: ${formatAllowedValues(error.params.allowedValues)}`;
    default:
      return `parameter '${path}' ${error.message ?? 'is invalid'}`;
  }
}

function dotPath(instancePath: string): string {
  return instancePath.split('/').filter(Boolean).join('.');
}

function joinPath(path: string, property: unknown): string {
  const name = String(property);
  return path ? `${path}.${name}` : name;
}

function formatAllowedValues(allowedValues: unknown): string {
  if (!Array.isArray(allowedValues)) {
    return String(allowedValues);
  }
  return allowedValues.map((value) => String(value)).join(', ');
}
