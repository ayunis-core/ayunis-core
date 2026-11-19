import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SourceProcessingStage } from 'src/domain/sources/application/models/source-processing-progress';

export class SourceProcessingProgressDto {
  @ApiProperty({ format: 'uuid' })
  sourceId: string;

  @ApiProperty({
    enum: SourceProcessingStage,
    enumName: 'SourceProcessingStage',
  })
  stage: SourceProcessingStage;

  @ApiPropertyOptional({
    minimum: 0,
    description: 'Completed extraction units, when reported by the worker',
  })
  completed?: number;

  @ApiPropertyOptional({ enum: ['pages', 'parts'] })
  unit?: 'pages' | 'parts';
}
