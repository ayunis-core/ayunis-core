import type { JSONSchema } from 'json-schema-to-ts';

/**
 * The schema-shaped view of a tool that the inference port needs in order
 * to advertise it to the LLM. Decoupled from `Tool` (the executable, typed
 * domain entity) so that callers without server-executable tools — e.g. the
 * OpenAI-compat surface, where the client owns execution — can construct
 * plain `{ name, description, parameters }` objects directly.
 *
 * `Tool` is structurally assignable to `ToolSchema`, so callers holding
 * full `Tool` instances can pass them through unchanged.
 */
export interface ToolSchema {
  readonly name: string;
  readonly description: string;
  readonly parameters: JSONSchema;
}
