import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { WorkspaceResponseDto } from './workspace-response.dto';

export class WorkspaceListResponseDto {
  @ApiProperty({ type: [WorkspaceResponseDto] })
  data: WorkspaceResponseDto[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}
