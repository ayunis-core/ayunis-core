import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class BaseSkillDto {
  @ApiProperty({
    description:
      'The name of the skill (must be unique per user). Only letters, numbers, emojis, hyphens, parentheses, and spaces allowed. Must start and end with a letter, number, emoji, or closing parenthesis.',
    example: 'Legal Research',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  @Matches(
    /^[\p{L}\p{N}\p{Emoji_Presentation}]([\p{L}\p{N}\p{Emoji_Presentation} ()-]*[\p{L}\p{N}\p{Emoji_Presentation})])?$/u,
    {
      message:
        'Name must contain only letters, numbers, emojis, hyphens, parentheses, and spaces, and must start and end with a letter, number, emoji, or closing parenthesis',
    },
  )
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
}
