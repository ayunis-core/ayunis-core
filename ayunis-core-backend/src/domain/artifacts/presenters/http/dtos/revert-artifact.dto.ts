import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class RevertArtifactDto {
  @ApiProperty({
    description: 'The version number to revert to',
    example: 1,
  })
  @IsInt()
  @Min(1)
  versionNumber: number;
}
