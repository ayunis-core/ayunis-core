import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { PaginatedSuperAdminUsersListResponseDto } from 'src/iam/users/presenters/http/dtos/super-admin-user-list-item-response.dto';

export function ApiSuperAdminUsersListQueries() {
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
      description: 'Successfully retrieved users across organizations',
      type: PaginatedSuperAdminUsersListResponseDto,
    }),
    ApiInternalServerErrorResponse({
      description: 'Internal server error occurred while retrieving users',
    }),
  );
}
