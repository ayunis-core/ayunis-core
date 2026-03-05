import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsOptional,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { DistributionMode } from '../../../domain/distribution-mode.enum';

export class CreateSkillTemplateDto {
  @ApiProperty({
    description:
      'The name of the skill template. Only letters, numbers, emojis, hyphens, and spaces allowed. Must start and end with a letter, number, or emoji.',
    example: 'Legal Guidelines',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  @Matches(
    /^[\p{L}\p{N}\p{Emoji_Presentation}]([\p{L}\p{N}\p{Emoji_Presentation} -]*[\p{L}\p{N}\p{Emoji_Presentation}])?$/u,
    {
      message:
        'Name must contain only letters, numbers, emojis, hyphens, and spaces, and must start and end with a letter, number, or emoji',
    },
  )
  @Matches(/^(?!.* {2})/, {
    message: 'Name must not contain consecutive spaces',
  })
  name: string;

  @ApiProperty({
    description: 'A short description of the skill template',
    example: 'Legal compliance instructions for all responses',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  shortDescription: string;

  @ApiProperty({
    description: 'The instructions for the skill template',
    example: 'Always follow legal guidelines when responding to user queries.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  instructions: string;

  @ApiProperty({
    description: 'The distribution mode of the skill template',
    enum: DistributionMode,
    example: DistributionMode.ALWAYS_ON,
  })
  @IsEnum(DistributionMode)
  distributionMode: DistributionMode;

  @ApiPropertyOptional({
    description: 'Whether the skill template is active (defaults to false)',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      'Whether copied skills should be active by default (only for pre_created_copy mode, defaults to false)',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  defaultActive?: boolean;

  @ApiPropertyOptional({
    description:
      'Whether copied skills should be pinned by default (only for pre_created_copy mode, defaults to false)',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  defaultPinned?: boolean;
}
