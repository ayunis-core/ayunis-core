import type { JsonSchema, MutableSchema } from '@ayunis/inference';
import {
  SchemaWalker,
  convertDraft04ExclusiveBoundsNode,
} from '@ayunis/inference';

const walker = new SchemaWalker((node: MutableSchema) => {
  convertDraft04ExclusiveBoundsNode(node);
  return node;
});

export function normalizeSchemaForMistral(schema: JsonSchema): JsonSchema {
  return walker.walk(schema);
}
