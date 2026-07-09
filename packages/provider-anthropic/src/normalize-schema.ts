import type Anthropic from '@anthropic-ai/sdk';
import type { JsonObject, JsonSchema } from '@ayunis/inference';
import {
  CombinatorFlattener,
  SchemaWalker,
  convertDraft04ExclusiveBoundsNode,
} from '@ayunis/inference';

export type AnthropicInputSchema = JsonObject &
  Anthropic.Messages.Tool.InputSchema;

const walker = new SchemaWalker((node) => {
  convertDraft04ExclusiveBoundsNode(node);
  return node;
});

export function normalizeSchemaForAnthropic(
  schema: JsonSchema,
): AnthropicInputSchema {
  const root = walker.walk(schema);
  new CombinatorFlattener(root).flatten();

  root.type = 'object';
  root.properties ??= {};
  return root as AnthropicInputSchema;
}
