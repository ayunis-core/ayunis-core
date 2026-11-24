import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SetOparlEmbeddingModelDto {
  @ApiProperty({
    format: 'uuid',
    description: 'ID of an embedding model of the catalog',
  })
  @IsUUID()
  modelId: string;
}

export class OparlEmbeddingModelDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  dimensions: number;
}

export class OparlEmbeddingModelResponseDto {
  @ApiProperty({
    type: OparlEmbeddingModelDto,
    nullable: true,
    description:
      'The model that embeds the mirror; without one, chunks are full-text searchable only',
  })
  model: OparlEmbeddingModelDto | null;
}
