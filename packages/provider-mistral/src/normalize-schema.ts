import type { JsonSchema, MutableSchema } from '@ayunis/inference';
import {
  SchemaNormalizer,
  convertDraft04ExclusiveBoundsNode,
} from '@ayunis/inference';

/**
 * Normalizes a tool's JSON schema for the Mistral API. Mistral rejects the
 * draft-04 boolean form of `exclusiveMinimum`/`exclusiveMaximum` ("True is
 * not of type 'number'") that MCP servers still emit.
 */
class MistralSchemaNormalizer extends SchemaNormalizer {
  protected visitNode(node: MutableSchema): MutableSchema {
    convertDraft04ExclusiveBoundsNode(node);
    return node;
  }
}

const normalizer = new MistralSchemaNormalizer();

export function normalizeSchemaForMistral(schema: JsonSchema): JsonSchema {
  return normalizer.normalize(schema);
}
