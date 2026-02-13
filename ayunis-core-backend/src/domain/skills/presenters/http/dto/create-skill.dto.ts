import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  Length,
  IsBoolean,
  IsOptional,
  Matches,
} from 'class-validator';

export class CreateSkillDto {
  @ApiProperty({
    description:
      'The name of the skill (must be unique per user). Only letters, numbers, hyphens, and spaces allowed. Must start and end with a letter or number.',
    example: 'Legal Research',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  @Matches(/^[a-zA-Z0-9]([a-zA-Z0-9 -]*[a-zA-Z0-9])?$/, {
    message:
      'Name must contain only letters, numbers, hyphens, and spaces, and must start and end with a letter or number',
  })
  @Matches(/^(?!.* {2})/, {
    message: 'Name must not contain consecutive spaces',
  })
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
