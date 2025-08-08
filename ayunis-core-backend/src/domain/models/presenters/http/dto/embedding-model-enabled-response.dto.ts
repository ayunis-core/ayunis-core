import { ApiProperty } from '@nestjs/swagger';

export class EmbeddingModelEnabledResponseDto {
  @ApiProperty({
    description: 'Whether the organization has an embedding model enabled',
    example: true,
  })
  isEmbeddingModelEnabled: boolean;
}
