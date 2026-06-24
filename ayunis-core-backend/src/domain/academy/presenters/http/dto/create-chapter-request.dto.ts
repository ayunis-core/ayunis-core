import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateChapterRequestDto {
  @ApiProperty({
    description: 'The title of the chapter',
    example: 'Getting Started',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'A description of what the chapter covers',
    example: 'Learn the basics of working with Ayunis Core.',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;
}
