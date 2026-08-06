import { applyDecorators } from '@nestjs/common';
import { ApiQuery, type ApiQueryOptions } from '@nestjs/swagger';

const USER_USAGE_QUERIES: ApiQueryOptions[] = [
  {
    name: 'startDate',
    type: String,
    required: false,
    description: 'Start date in ISO format',
    example: '2024-01-01T00:00:00.000Z',
  },
  {
    name: 'endDate',
    type: String,
    required: false,
    description: 'End date in ISO format',
    example: '2024-01-31T23:59:59.999Z',
  },
  {
    name: 'limit',
    type: Number,
    required: false,
    description: 'Number of users per page (1-1000). Defaults to 50.',
    example: 50,
  },
  {
    name: 'offset',
    type: Number,
    required: false,
    description: 'Number of users to skip for pagination. Defaults to 0.',
    example: 0,
  },
  {
    name: 'search',
    type: String,
    required: false,
    description: 'Search term to filter users by name or email',
    example: 'john.doe',
  },
  {
    name: 'sortBy',
    enum: ['credits', 'requests', 'lastActivity', 'userName'],
    required: false,
    description: 'Field to sort users by. Defaults to credits.',
    example: 'credits',
  },
  {
    name: 'sortOrder',
    enum: ['asc', 'desc'],
    required: false,
    description: 'Sort order (ascending or descending). Defaults to desc.',
    example: 'desc',
  },
];

/**
 * Swagger query-parameter metadata for the paginated "user usage" endpoint.
 * Extracted into a composed decorator so the controller handler stays within
 * the max-lines-per-function complexity budget.
 */
export function ApiUserUsageQueries() {
  return applyDecorators(...USER_USAGE_QUERIES.map((query) => ApiQuery(query)));
}
