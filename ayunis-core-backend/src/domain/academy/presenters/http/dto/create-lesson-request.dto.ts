import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateLessonRequestDto {
  @ApiProperty({
    description: 'The title of the lesson',
    example: 'Creating your first chat',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    description: 'An optional description of the lesson',
    example: 'A short walkthrough of the chat interface.',
    maxLength: 2000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    description: 'The Loom share or embed link of the lesson video',
    example: 'https://www.loom.com/share/abc123def456',
    maxLength: 500,
  })
  @IsUrl({
    require_protocol: true,
    protocols: ['https'],
    host_whitelist: ['loom.com', 'www.loom.com'],
  })
  @Matches(/^https:\/\/(www\.)?loom\.com\/(share|embed)\/[A-Za-z0-9]+/, {
    message: 'loomUrl must be a Loom share or embed link',
  })
  @MaxLength(500)
  loomUrl: string;
}
