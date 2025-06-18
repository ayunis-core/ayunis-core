import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class UpdateUserNameDto {
  @ApiProperty({
    description: 'New name for the user',
    example: 'John Doe',
    minLength: 1,
    maxLength: 100,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name cannot be empty' })
  @Length(1, 100, { message: 'Name must be between 1 and 100 characters' })
  name: string;
}
