import { IsISO8601, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateIcsDto {
  @ApiProperty({
    description: 'Event title',
    example: 'Team meeting',
    minLength: 1,
    required: true,
  })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({
    description: 'Event description',
    example: 'Discuss Q3 roadmap',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Location',
    example: 'Berlin HQ, Room 3',
    required: false,
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    description: 'Start time (ISO 8601)',
    example: '2025-09-01T10:30:00Z',
    required: true,
    format: 'date-time',
  })
  @IsISO8601()
  start: string; // ISO

  @ApiProperty({
    description: 'End time (ISO 8601)',
    example: '2025-09-01T11:30:00Z',
    required: true,
    format: 'date-time',
  })
  @IsISO8601()
  end: string; // ISO
}
