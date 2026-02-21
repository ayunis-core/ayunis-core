import { ApiProperty } from '@nestjs/swagger';

export class KnowledgeBaseSummaryResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the knowledge base',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the knowledge base',
    example: 'Municipal Zoning Guidelines',
  })
  name: string;
}
