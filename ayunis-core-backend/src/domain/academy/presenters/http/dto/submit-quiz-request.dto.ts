import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import type { UUID } from 'crypto';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class SubmitQuizAnswerDto {
  @ApiProperty({
    type: 'string',
    format: 'uuid',
    description: 'The id of the answered question',
  })
  @IsUUID()
  questionId: UUID;

  @ApiProperty({
    type: 'integer',
    description: 'The 0-based index of the selected answer option',
    example: 0,
  })
  @IsInt()
  @Min(0)
  selectedOptionIndex: number;
}

export class SubmitQuizRequestDto {
  @ApiProperty({
    type: [SubmitQuizAnswerDto],
    description: 'One answer per drawn question',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmitQuizAnswerDto)
  answers: SubmitQuizAnswerDto[];
}
