import Ajv from 'ajv';
import { Tool } from '../tool.entity';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { ToolType } from '../value-objects/tool-type.enum';
import { DataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { DataType } from 'src/domain/sources/domain/source-type.enum';

const codeExecutionToolParameters = {
  type: 'object' as const,
  properties: {
    code: {
      type: 'string' as const,
      description: 'The code to execute. ',
    },
    dataSourceIds: {
      description:
        'Optional array of CSV data source UUIDs. Each will be available as /execution/files/{uuid}.csv. If none, provide an empty array.',
      type: 'array' as const,
      items: {
        type: 'string' as const,
        description: 'UUID of a CSV data source',
      },
    },
  },
  required: ['code', 'dataSourceIds'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type CodeExecutionToolParameters = FromSchema<
  typeof codeExecutionToolParameters
>;

export class CodeExecutionTool extends Tool {
  constructor(availableSources: DataSource[]) {
    const csvSources = availableSources.filter(
      (s) => s.dataType === DataType.CSV,
    );
    const csvDescription =
      csvSources.length > 0
        ? ` Available CSV data sources: ${csvSources.map((s) => `${s.name} (ID: ${s.id})`).join(', ')}. When you specify a dataSourceId, the CSV file will be available at /execution/files/{uuid}.csv - you can load it with pandas.read_csv('/execution/files/{uuid}.csv').`
        : '';

    const csvLongDescription =
      csvSources.length > 0
        ? `\nAvailable CSV data sources:\n${csvSources.map((s) => `- ${s.name} (ID: ${s.id})`).join('\n')}\n\nWhen using dataSourceIds, CSV files are available at /execution/files/{uuid}.csv\nLoad with: pandas.read_csv('/execution/files/{uuid}.csv')`
        : '';

    super({
      name: ToolType.CODE_EXECUTION,
      description: `Execute Python code in a sandboxed environment. Print results to see output. Variables don't persist between executions.${csvDescription}`,
      descriptionLong: `
<code_execution>
Output visibility: You see printed output, but the user does NOT see it directly - you must relay results in your response.

Output files: Write CSV files to /execution/output/ to save as thread data sources. Only CSV is supported - for other formats, include content in your response instead.
${csvLongDescription}
</code_execution>
      `.trim(),
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

  get returnsPii(): boolean {
    return true;
  }
}
