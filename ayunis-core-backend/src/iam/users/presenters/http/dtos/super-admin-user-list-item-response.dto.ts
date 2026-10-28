import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { UserResponseDto } from 'src/iam/users/presenters/http/dtos/user-response.dto';

export class SuperAdminUserListItemResponseDto extends UserResponseDto {
  @ApiProperty({
    description: 'Name of the organization the user belongs to',
    example: 'Stadt Beispiel',
  })
  orgName: string;
}

export class PaginatedSuperAdminUsersListResponseDto {
  @ApiProperty({
    description: 'Array of users for the current page',
    type: [SuperAdminUserListItemResponseDto],
  })
  data: SuperAdminUserListItemResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationDto,
  })
  pagination: PaginationDto;
}
