import type { JSONSchema } from 'json-schema-to-ts';

/**
 * Shared Y-axis schema for chart tools.
 * Describes an array of data series, each with a label and corresponding values.
 */
export const yAxisSchema = {
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
} as const satisfies JSONSchema;

/**
 * Shared chart title schema for chart tools.
 */
export const chartTitleSchema = {
  type: 'string' as const,
  description: 'The title of the chart',
} as const satisfies JSONSchema;

/**
 * Shared insight schema for chart tools.
 */
export const insightSchema = {
  type: 'string' as const,
  description:
    'A short insight about the data displayed in the chart. This insight should be relevant to the data displayed in the chart and should be a short sentence or two. If no insight makes sense, provide an empty string',
} as const satisfies JSONSchema;
