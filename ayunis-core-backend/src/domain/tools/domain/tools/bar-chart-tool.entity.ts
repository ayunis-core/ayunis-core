import { createAjv } from 'src/common/validators/ajv.factory';
import { ToolType } from '../value-objects/tool-type.enum';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { DisplayableTool } from '../displayable-tool.entity';

const barChartToolParameters = {
  type: 'object' as const,
  properties: {
    chartTitle: {
      type: 'string' as const,
      description: 'The title of the chart',
    },
    xAxis: {
      type: 'array' as const,
      items: {
        type: 'string' as const,
      },
      description:
        'The data points of the X-axis. This data will mostly be used as labels for the Y axis data points. The order of the X-axis must match exactly the order of the corresponding values in the Y-axis array.',
    },
    yAxis: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          label: {
            type: 'string' as const,
          },
          values: {
            type: 'array' as const,
            items: {
              type: 'number' as const,
            },
          },
        },
        required: ['label', 'values'],
        additionalProperties: false,
      },
      description:
        'The values for the y axis. One array for each data series. Each object in the array contains the property "label" for the label of the data series and a property "values" with the values of the data series. The order of the values array must match exactly the order of the corresponding labels in the X-axis array.',
    },
    insight: {
      type: 'string' as const,
      description:
        'A short insight about the data displayed in the chart. This insight should be relevant to the data displayed in the chart and should be a short sentence or two. If no insight makes sense, provide an empty string',
    },
  },
  required: ['xAxis', 'yAxis', 'chartTitle', 'insight'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type BarChartToolParameters = FromSchema<typeof barChartToolParameters>;

export class BarChartTool extends DisplayableTool {
  constructor() {
    super({
      name: ToolType.BAR_CHART,
      description:
        'Display a bar chart. Best for comparing quantities across categories.',
      parameters: barChartToolParameters,
      type: ToolType.BAR_CHART,
    });
  }

  validateParams(params: Record<string, any>): BarChartToolParameters {
    const ajv = createAjv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as BarChartToolParameters;
  }

  get returnsPii(): boolean {
    return false;
  }
}
