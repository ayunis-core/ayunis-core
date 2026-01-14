import Ajv from 'ajv';
import { ToolType } from '../value-objects/tool-type.enum';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { DisplayableTool } from '../displayable-tool.entity';

const pieChartToolParameters = {
  type: 'object' as const,
  properties: {
    chartTitle: {
      type: 'string' as const,
      description: 'The title of the chart',
    },
    data: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          label: {
            type: 'string' as const,
          },
          value: {
            type: 'number' as const,
          },
        },
        required: ['label', 'value'],
        additionalProperties: false,
      },
      description:
        'The data for the pie chart. Each object in the array contains a label for the data point and a value for the data point.',
    },
    insight: {
      type: 'string' as const,
      description:
        'A short insight about the data displayed in the chart. This insight should be relevant to the data displayed in the chart and should be a short sentence or two. If no insight makes sense, provide an empty string',
    },
  },
  required: ['data', 'chartTitle', 'insight'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type PieChartToolParameters = FromSchema<typeof pieChartToolParameters>;

export class PieChartTool extends DisplayableTool {
  constructor() {
    super({
      name: ToolType.PIE_CHART,
      description:
        'Display a pie chart. Best for showing proportions of a whole.',
      parameters: pieChartToolParameters,
      type: ToolType.PIE_CHART,
    });
  }

  validateParams(params: Record<string, any>): PieChartToolParameters {
    const ajv = new Ajv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as PieChartToolParameters;
  }

  get returnsPii(): boolean {
    return false;
  }
}
