import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CreateChapterRequestDto } from './create-chapter-request.dto';

// Full-replace update: same fields and validation as create, plus the
// optional per-chapter quiz activation toggle and pass threshold.
export class UpdateChapterRequestDto extends CreateChapterRequestDto {
  @ApiPropertyOptional({
    description: 'Whether a quiz is activated for this chapter',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  quizEnabled?: boolean;

  @ApiPropertyOptional({
    description:
      'Percentage of correct answers required to pass this chapter quiz',
    example: 80,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  passThreshold?: number;
}
