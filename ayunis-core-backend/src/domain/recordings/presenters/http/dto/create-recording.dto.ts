import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { RecordingOwnerDto } from './recording-owner.dto';

export class CreateRecordingDto extends RecordingOwnerDto {
  @ApiProperty({
    description: 'The name of the recording',
    example: 'Stadtratssitzung 12. November',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string;
}
