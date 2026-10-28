import { ApiProperty } from '@nestjs/swagger';

export class SourceCitationChunkResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Exact extracted chunk text shown to the model' })
  content: string;

  @ApiProperty({ type: Number, nullable: true })
  startLine: number | null;

  @ApiProperty({ type: Number, nullable: true })
  endLine: number | null;
}

export class SourceCitationSourceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: String, nullable: true })
  url: string | null;
}

export class SourceCitationResponseDto {
  @ApiProperty({ type: SourceCitationChunkResponseDto })
  chunk: SourceCitationChunkResponseDto;

  @ApiProperty({ type: SourceCitationSourceResponseDto })
  source: SourceCitationSourceResponseDto;
}
