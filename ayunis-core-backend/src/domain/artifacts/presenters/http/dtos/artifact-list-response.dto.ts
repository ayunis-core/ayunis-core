import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { ArtifactResponseDto } from './artifact-response.dto';

export class ArtifactListResponseDto {
  @ApiProperty({ type: [ArtifactResponseDto] })
  data: ArtifactResponseDto[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}
