import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AcademyMinimumModuleSecondsDto {
  @ApiProperty({
    description:
      'Seconds each academy video page must be open and visible before its chapter can be confirmed. 0 disables the requirement.',
    example: 60,
    type: Number,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  seconds: number;
}
