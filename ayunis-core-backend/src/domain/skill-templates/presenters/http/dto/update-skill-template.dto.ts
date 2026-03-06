import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateSkillTemplateDto {
  @ApiPropertyOptional({
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
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'A short description of the skill template',
    example: 'Legal compliance instructions for all responses',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @IsOptional()
  shortDescription?: string;

  @ApiPropertyOptional({
    description: 'The instructions for the skill template',
    example: 'Always follow legal guidelines when responding to user queries.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  @IsOptional()
  instructions?: string;

  @ApiPropertyOptional({
    description: 'The distribution mode of the skill template',
    enum: DistributionMode,
    example: DistributionMode.ALWAYS_ON,
  })
  @IsEnum(DistributionMode)
  @IsOptional()
  distributionMode?: DistributionMode;

  @ApiPropertyOptional({
    description: 'Whether the skill template is active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
