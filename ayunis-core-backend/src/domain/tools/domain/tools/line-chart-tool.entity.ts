import { createAjv } from 'src/common/validators/ajv.factory';
import { ToolType } from '../value-objects/tool-type.enum';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { DisplayableTool } from '../displayable-tool.entity';
import {
  yAxisSchema,
  chartTitleSchema,
  insightSchema,
} from './shared-chart-schemas';

const lineChartToolParameters = {
  type: 'object' as const,
  properties: {
    chartTitle: chartTitleSchema,
    xAxis: {
      type: 'array' as const,
      items: {
        type: 'string' as const,
      },
      description:
        'The data points of the X-axis. This data will mostly be used as labels for the Y axis data points. The order of the X-axis must match exactly the order of the corresponding values in the Y-axis array. If you are showing time series data, make sure it is ordered by date.',
    },
    yAxis: yAxisSchema,
    insight: insightSchema,
  },
  required: ['xAxis', 'yAxis', 'chartTitle', 'insight'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type LineChartToolParameters = FromSchema<typeof lineChartToolParameters>;

export class LineChartTool extends DisplayableTool {
  constructor() {
    super({
      name: ToolType.LINE_CHART,
      description:
        'Display a line chart. Best for showing trends over time. Ensure time series data is ordered chronologically.',
      parameters: lineChartToolParameters,
      type: ToolType.LINE_CHART,
    });
  }

  validateParams(params: Record<string, unknown>): LineChartToolParameters {
    const ajv = createAjv();
    const validate = ajv.compile(this.parameters);
    const valid = validate(params);
    if (!valid) {
      throw new Error(JSON.stringify(validate.errors));
    }
    return params as LineChartToolParameters;
  }

  get returnsPii(): boolean {
    return false;
  }
}
