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
      'The name of the skill template. No leading/trailing whitespace, no consecutive spaces, no control characters. Max 100 characters.',
    example: 'Legal Guidelines',
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
  @Matches(/^[^\p{Cc}\p{Cf}]*$/u, {
    message: 'Name must not contain control characters',
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
}
