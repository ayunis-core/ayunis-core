export type McpFileFieldKind = 'single' | 'list';

export interface McpFileField {
  readonly name: string;
  readonly kind: McpFileFieldKind;
}

export class InvalidMcpFileParamsError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'InvalidMcpFileParamsError';
  }
}

const FILE_ID_DESCRIPTION = 'The ID of a file attached to this chat.';
const MAX_REF_HOPS = 32;

type Schema = Record<string, unknown>;

/**
 * The input schema the model sees for an MCP tool that declares file fields
 * (`_meta["openai/fileParams"]`): each file object becomes the ID of a chat
 * file, each array of file objects a list of such IDs. The host turns the IDs
 * back into file objects before calling the server.
 */
export function toModelFacingSchema(
  inputSchema: Schema,
  fileParams: readonly string[],
): { parameters: Schema; fileFields: McpFileField[] } {
  if (fileParams.length === 0) {
    return { parameters: inputSchema, fileFields: [] };
  }
  const properties = inputSchema.properties;
  if (!isSchema(properties)) {
    throw new InvalidMcpFileParamsError('the input schema has no properties');
  }
  const fileFields = [...new Set(fileParams)].map((name) => ({
    name,
    kind: fileFieldKind(name, properties, inputSchema),
  }));
  const replaced: Schema = { ...properties };
  for (const field of fileFields) {
    replaced[field.name] =
      field.kind === 'single'
        ? { type: 'string', description: FILE_ID_DESCRIPTION }
        : {
            type: 'array',
            items: { type: 'string', description: FILE_ID_DESCRIPTION },
          };
  }
  return { parameters: { ...inputSchema, properties: replaced }, fileFields };
}

function fileFieldKind(
  name: string,
  properties: Schema,
  root: Schema,
): McpFileFieldKind {
  const schema = Object.hasOwn(properties, name)
    ? resolveLocalRef(properties[name], root)
    : undefined;
  if (!schema) {
    throw new InvalidMcpFileParamsError(
      `file field '${name}' is not in the input schema`,
    );
  }
  if (schema.type === 'object') return 'single';
  if (
    schema.type === 'array' &&
    resolveLocalRef(schema.items, root)?.type === 'object'
  ) {
    return 'list';
  }
  throw new InvalidMcpFileParamsError(
    `file field '${name}' is neither an object nor an array of objects`,
  );
}

function resolveLocalRef(schema: unknown, root: Schema): Schema | undefined {
  let current = schema;
  for (let hop = 0; hop < MAX_REF_HOPS; hop++) {
    if (!isSchema(current)) return undefined;
    const ref = current.$ref;
    if (typeof ref !== 'string') return current;
    current = resolvePointer(ref, root);
  }
  return undefined;
}

function resolvePointer(ref: string, root: Schema): unknown {
  if (!ref.startsWith('#')) return undefined;
  const segments = ref
    .slice(1)
    .split('/')
    .slice(1)
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'));
  let current: unknown = root;
  for (const segment of segments) {
    if (!isSchema(current) || !Object.hasOwn(current, segment)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function isSchema(value: unknown): value is Schema {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
