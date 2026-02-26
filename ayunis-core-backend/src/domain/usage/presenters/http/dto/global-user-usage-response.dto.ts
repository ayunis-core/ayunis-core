import { ApiProperty } from '@nestjs/swagger';
import { BaseUserUsageDto } from './base-user-usage.dto';

export class GlobalUserUsageDto extends BaseUserUsageDto {
  @ApiProperty({ description: 'Name of the organization the user belongs to' })
  organizationName: string;
}

export class GlobalUserUsageResponseDto {
  @ApiProperty({
    description: 'Top users by token usage across all organizations',
    type: [GlobalUserUsageDto],
  })
  data: GlobalUserUsageDto[];
}
