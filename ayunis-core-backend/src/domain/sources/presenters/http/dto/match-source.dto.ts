import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { UUID } from 'crypto';
import { Type } from 'class-transformer';

export class MatchSourceDto {
  @ApiProperty({
    description: 'Source ID to search within',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  sourceId: UUID;

  @ApiProperty({
    description: 'Query text to search for',
    example: 'machine learning algorithms',
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiProperty({
    description: 'Similarity threshold (0.0 = identical, 2.0 = opposite)',
    example: 0.8,
    required: false,
    minimum: 0,
    maximum: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  @Type(() => Number)
  similarityThreshold?: number;

  @ApiProperty({
    description: 'Maximum number of results to return',
    example: 10,
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
