import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiQuery,
  ApiResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { PaginatedUsersListResponseDto } from '../dtos/paginated-users-list-response.dto';

/**
 * Shared API documentation for paginated user list endpoints.
 * Includes query parameters (search, limit, offset) and success response.
 */
export function ApiUsersListQueries() {
  return applyDecorators(
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      description: 'Search users by name or email',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Maximum number of users to return (default: 25)',
    }),
    ApiQuery({
      name: 'offset',
      required: false,
      type: Number,
      description: 'Number of users to skip (default: 0)',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Successfully retrieved users in the organization',
      type: PaginatedUsersListResponseDto,
    }),
    ApiInternalServerErrorResponse({
      description: 'Internal server error occurred while retrieving users',
    }),
  );
}
