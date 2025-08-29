import Ajv from 'ajv';
import { Tool } from '../tool.entity';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { ToolType } from '../value-objects/tool-type.enum';
import { FileSource } from 'src/domain/sources/domain/sources/file-source.entity';

const codeExecutionToolParameters = {
  type: 'object' as const,
  properties: {
    code: {
      type: 'string' as const,
      description: 'The code to execute',
    },
    files: {
      description:
        'Optional array of file source names. These files can be referenced in the code through "import <file_name>".',
      type: 'array' as const,
      items: {
        type: 'string' as const,
        description: 'The name of the file source',
      },
    },
  },
  required: ['code', 'files'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type CodeExecutionToolParameters = FromSchema<
  typeof codeExecutionToolParameters
>;

export class CodeExecutionTool extends Tool {
  constructor(availableSources: FileSource[]) {
    super({
      name: ToolType.CODE_EXECUTION,
      description: `Execute code. The code will be executed in the context of the files provided. The code will be executed in a sandboxed environment. If you pass a file name, you can use it in the code through "import <file_name>". The files are: ${availableSources
        .map((source) => source.name)
        .join(', ')}`,
      parameters: codeExecutionToolParameters,
      type: ToolType.CODE_EXECUTION,
    });
  }

  validateParams(params: Record<string, any>): CodeExecutionToolParameters {
    const ajv = new Ajv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as CodeExecutionToolParameters;
  }
}
