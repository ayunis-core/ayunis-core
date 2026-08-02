import { ApiProperty } from '@nestjs/swagger';
import { SourceProcessingStage } from '../../../domain/source-processing-progress';

export class SourceProcessingProgressDto {
  @ApiProperty({
    description: 'Current processing stage',
    enum: SourceProcessingStage,
  })
  stage: SourceProcessingStage;

  @ApiProperty({
    description: 'Pages extracted so far (documents only)',
    required: false,
  })
  processedPages?: number;

  @ApiProperty({
    description: 'Total page count (documents only)',
    required: false,
  })
  totalPages?: number;
}
