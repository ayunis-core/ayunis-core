import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  Length,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreateSkillDto {
  @ApiProperty({
    description: 'The name of the skill (must be unique per user)',
    example: 'Legal Research',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string;

  @ApiProperty({
    description:
      'A short description of the skill (shown in system prompt for LLM to decide activation)',
    example:
      'Research legal topics, find relevant case law, and draft legal documents.',
  })
  @IsString()
  @IsNotEmpty()
  shortDescription: string;

  @ApiProperty({
    description:
      'Detailed instructions for the skill (injected when the skill is activated)',
    example:
      'You are a legal research assistant. When activated, search through the attached legal databases...',
  })
  @IsString()
  @IsNotEmpty()
  instructions: string;

  @ApiPropertyOptional({
    description: 'Whether the skill is active (defaults to false)',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
