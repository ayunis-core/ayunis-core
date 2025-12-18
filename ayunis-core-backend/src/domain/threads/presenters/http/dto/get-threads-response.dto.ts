import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { GetThreadsResponseDtoItem } from './get-threads-response-item.dto';

export class GetThreadsResponseDto {
  @ApiProperty({
    description: 'Array of threads for the current page',
    type: [GetThreadsResponseDtoItem],
  })
  data: GetThreadsResponseDtoItem[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationDto,
  })
  pagination: PaginationDto;
}
