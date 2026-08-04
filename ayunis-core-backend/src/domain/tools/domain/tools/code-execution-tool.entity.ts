import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { Tool } from '../tool.entity';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { ToolType } from '../value-objects/tool-type.enum';
import type { DataSource } from 'src/domain/sources/domain/sources/data-source.entity';

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
    // Every DataSource is CSV today (DataType has a single member);
    // reinstate a dataType filter here when a second type lands.
    const csvSources = availableSources;
    const sourceSummaries = csvSources
      .map((s) => `${s.name} (ID: ${s.id})`)
      .join(', ');
    const sourceLines = csvSources
      .map((s) => `- ${s.name} (ID: ${s.id})`)
      .join('\n');
    const csvDescription =
      csvSources.length > 0
        ? ` Available CSV data sources: ${sourceSummaries}. When you specify a dataSourceId, the CSV file will be available at /execution/files/{uuid}.csv - you can load it with pandas.read_csv('/execution/files/{uuid}.csv').`
        : '';

    const csvLongDescription =
      csvSources.length > 0
        ? `\nAvailable CSV data sources:\n${sourceLines}\n\nWhen using dataSourceIds, CSV files are available at /execution/files/{uuid}.csv\nLoad with: pandas.read_csv('/execution/files/{uuid}.csv')`
        : '';

    super({
      name: ToolType.CODE_EXECUTION,
      description: `Execute Python code in a sandboxed environment. Print results to see output. Variables don't persist between executions.${csvDescription}`,
      descriptionLong:
        `Output visibility: You see printed output, but the user does NOT see it directly - you must relay results in your response.

Output files: Write CSV files to /execution/output/ to save as thread data sources. Only CSV is supported - for other formats, include content in your response instead.
${csvLongDescription}`.trim(),
      parameters: codeExecutionToolParameters,
      type: ToolType.CODE_EXECUTION,
    });
  }

  validateParams(params: Record<string, unknown>): CodeExecutionToolParameters {
    return validateToolParams<CodeExecutionToolParameters>(
      this.parameters,
      params,
    );
  }

  get returnsPii(): boolean {
    return true;
  }
}
