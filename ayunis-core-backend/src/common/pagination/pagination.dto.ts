import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiProperty({
    description: 'Maximum number of items per page',
    example: 50,
  })
  limit: number;

  @ApiProperty({
    description: 'Number of items to skip',
    example: 0,
  })
  offset: number;

  @ApiPropertyOptional({
    description: 'Total number of items available',
    example: 150,
  })
  total?: number;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Array of items for the current page',
    type: 'array',
  })
  data: T[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationDto,
  })
  pagination: PaginationDto;
}
