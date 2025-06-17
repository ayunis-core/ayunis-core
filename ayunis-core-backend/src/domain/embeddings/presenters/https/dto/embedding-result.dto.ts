import { ApiProperty } from '@nestjs/swagger';
import { EmbeddingsProvider } from '../../../domain/embeddings-provider.enum';
import { ValidateNested } from 'class-validator';
import { IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class EmbeddingResultDto {
  @ApiProperty({
    description: 'The vector representation of the embedded text',
    type: [Number],
    example: [0.01, -0.02, 0.03, -0.04, 0.05],
  })
  vector: number[];

  @ApiProperty({
    description: 'The original text that was embedded',
    type: String,
  })
  text: string;

  @ApiProperty({
    description: 'The dimension (length) of the embedding vector',
    type: Number,
    example: 384,
  })
  dimension: number;

  @ApiProperty({
    description: 'Metadata about the embedding process',
    type: Object,
    example: {
      provider: EmbeddingsProvider.OPENAI,
      model: 'text-embedding-3-small',
      dimension: 1536,
    },
  })
  metadata: {
    provider: EmbeddingsProvider;
    model: string;
    dimension: number;
  };
}

export class EmbeddingResultsDto {
  @ApiProperty({
    description: 'The list of embeddings',
    type: [EmbeddingResultDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmbeddingResultDto)
  results: EmbeddingResultDto[];
}
