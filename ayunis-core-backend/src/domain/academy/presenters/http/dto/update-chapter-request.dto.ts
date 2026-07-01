import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateChapterRequestDto } from './create-chapter-request.dto';

// Full-replace update: same fields and validation as create, plus the
// optional per-chapter quiz activation toggle.
export class UpdateChapterRequestDto extends CreateChapterRequestDto {
  @ApiPropertyOptional({
    description: 'Whether a quiz is activated for this chapter',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  quizEnabled?: boolean;
}
