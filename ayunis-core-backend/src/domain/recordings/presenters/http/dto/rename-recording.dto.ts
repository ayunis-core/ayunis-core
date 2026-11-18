import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class RenameRecordingDto {
  @ApiProperty({
    description: 'The new name of the recording',
    example: 'Stadtratssitzung 12. November',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string;
}
