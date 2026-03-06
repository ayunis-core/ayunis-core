import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class BaseSkillDto {
  @ApiProperty({
    description:
      'The name of the skill (must be unique per user). No leading/trailing whitespace, no consecutive spaces, no control characters. Max 100 characters.',
    example: 'Legal Research',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  @Matches(/^\S.*\S$|^\S$/, {
    message: 'Name must not start or end with whitespace',
  })
  @Matches(/^(?!.* {2})/, {
    message: 'Name must not contain consecutive spaces',
  })
  @Matches(/^[^\p{Cc}]*$/u, {
    message: 'Name must not contain control characters',
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
}
