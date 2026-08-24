import type { JsonSchema, JsonValue, MutableSchema } from '@ayunis/inference';
import {
  CombinatorFlattener,
  SchemaWalker,
  convertDraft04ExclusiveBoundsNode,
  isRecord,
  schemaAllowsNull,
} from '@ayunis/inference';

// Hand-maintained — the SDK doesn't type them.
// https://platform.openai.com/docs/guides/structured-outputs#supported-schemas
const OPENAI_SUPPORTED_FORMATS = new Set([
  'date-time',
  'time',
  'date',
  'duration',
  'email',
  'hostname',
  'ipv4',
  'ipv6',
  'uuid',
]);

const walker = new SchemaWalker((node) => {
  if (
    typeof node.format === 'string' &&
    !OPENAI_SUPPORTED_FORMATS.has(node.format)
  ) {
    delete node.format;
  }
  convertOneOfToAnyOf(node);
  delete node.minProperties;
  delete node.maxProperties;
  convertDraft04ExclusiveBoundsNode(node);
  normalizeObjectType(node);
  return node;
});

// Strict function schemas reject `oneOf`; `anyOf` is the supported equivalent
// for the disjoint alternatives used by our tools and provider integrations.
function convertOneOfToAnyOf(schema: MutableSchema): void {
  if (!Array.isArray(schema.oneOf)) return;
  schema.anyOf = schema.oneOf;
  delete schema.oneOf;
}

// Strict mode treats any schema declaring `properties` as an object, even when
// an explicit `type: 'object'` is omitted (common in MCP-style schemas).
function isObjectSchema(schema: MutableSchema): boolean {
  return schema.type === 'object' || 'properties' in schema;
}

function normalizeObjectType(schema: MutableSchema): void {
  if (!isObjectSchema(schema)) {
    return;
  }
  // Strict mode requires additionalProperties:false on every object — force it
  // even when the source schema set it to `true`, which OpenAI rejects.
  schema.additionalProperties = false;
  if (isRecord(schema.properties)) {
    schema.properties = withNullableOptionals(
      schema.properties,
      schema.required,
    );
    schema.required = Object.keys(schema.properties);
  } else {
    schema.properties = {};
    schema.required = [];
  }
}

// Strict mode also forces every property into `required`. Originally-optional
// properties get a null escape hatch instead (OpenAI's documented optionality
// pattern) — otherwise the model must fabricate a value for fields the user
// never asked about.
function withNullableOptionals(
  properties: MutableSchema,
  required: JsonValue | undefined,
): MutableSchema {
  const originallyRequired = new Set(Array.isArray(required) ? required : []);
  return Object.fromEntries(
    Object.entries(properties).map(([key, child]): [string, JsonValue] => {
      if (!isRecord(child)) {
        return [key, child];
      }
      const collapsed = collapseSingleAllOf(child);
      return [
        key,
        originallyRequired.has(key) ? collapsed : withNullAllowed(collapsed),
      ];
    }),
  );
}

// Strict mode rejects `allOf`, and it cannot take a null branch either — AND
// semantics would leave the property unsatisfiable. A lone branch is
// equivalent to that branch plus the sibling keywords, so inline it and let
// the normal hatch rules apply (Pydantic v1 emits this for a nested-model
// field with a description or default). Multiple branches would need a real
// constraint merge and are left alone.
function collapseSingleAllOf(schema: MutableSchema): MutableSchema {
  const branches = schema.allOf;
  if (!Array.isArray(branches) || branches.length !== 1) {
    return schema;
  }
  const [branch] = branches;
  if (!isRecord(branch)) {
    return schema;
  }
  const siblings = { ...schema };
  delete siblings.allOf;
  return { ...branch, ...siblings };
}

function withNullAllowed(child: MutableSchema): MutableSchema {
  if (schemaAllowsNull(child)) {
    return child;
  }
  const copy = { ...child };
  if (extendWithNull(copy)) {
    return copy;
  }
  // A bare $ref carries no type/enum/combinator to extend — wrap it instead
  // (OpenAI's documented optionality pattern for refs).
  if (typeof copy.$ref === 'string') {
    return { anyOf: [child, { type: 'null' }] };
  }
  return child;
}

function extendWithNull(copy: MutableSchema): boolean {
  let changed = extendTypeAndEnumWithNull(copy);
  if (!changed && Array.isArray(copy.anyOf)) {
    copy.anyOf = [...copy.anyOf, { type: 'null' }];
    changed = true;
  }
  if (!changed && Array.isArray(copy.oneOf)) {
    copy.oneOf = [...copy.oneOf, { type: 'null' }];
    changed = true;
  }
  // Type-less object schemas (`properties` without `type`, common in
  // MCP-style schemas) have nothing above to extend — declare them nullable
  // objects.
  if (!changed && !('type' in copy) && isRecord(copy.properties)) {
    copy.type = ['object', 'null'];
    changed = true;
  }
  return changed;
}

function extendTypeAndEnumWithNull(copy: MutableSchema): boolean {
  let changed = false;
  if (typeof copy.type === 'string') {
    copy.type = [copy.type, 'null'];
    changed = true;
  } else if (Array.isArray(copy.type)) {
    copy.type = [...copy.type, 'null'];
    changed = true;
  }
  if (Array.isArray(copy.enum)) {
    copy.enum = [...copy.enum, null];
    changed = true;
  }
  return changed;
}

export function normalizeSchemaForOpenAI(schema: JsonSchema): JsonSchema {
  const root = walker.walk(schema);
  new CombinatorFlattener(root).flatten();
  normalizeObjectType(root);

  return root;
}
