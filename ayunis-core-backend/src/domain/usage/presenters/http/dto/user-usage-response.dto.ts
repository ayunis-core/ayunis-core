import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/pagination';
import { BaseUserUsageDto } from './base-user-usage.dto';

export class UserUsageDto extends BaseUserUsageDto {}

export class UserUsageResponseDto {
  @ApiProperty({ description: 'User usage statistics', type: [UserUsageDto] })
  data: UserUsageDto[];

  @ApiProperty({ description: 'Pagination metadata', type: PaginationDto })
  pagination: PaginationDto;
}
