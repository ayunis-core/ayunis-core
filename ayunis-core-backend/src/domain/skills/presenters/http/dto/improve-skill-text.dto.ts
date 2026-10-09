import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SkillTextField } from 'src/domain/skills/application/use-cases/improve-skill-text/improve-skill-text.command';

const MAX_FIELD_LENGTH = 10000;

export class ImproveSkillTextDto {
  @ApiProperty({
    enum: SkillTextField,
    description: 'Which of the two texts should come back rewritten',
  })
  @IsEnum(SkillTextField)
  field: SkillTextField;

  @ApiPropertyOptional({
    description: 'The skill name, when it already exists',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'The trigger as it currently stands in the form',
  })
  @IsString()
  @MaxLength(MAX_FIELD_LENGTH)
  trigger: string;

  @ApiProperty({
    description: 'The instructions as they currently stand in the form',
  })
  @IsString()
  @MaxLength(MAX_FIELD_LENGTH)
  instructions: string;
}

export class ImprovedSkillTextResponseDto {
  @ApiProperty({ description: 'The rewritten text for the requested field' })
  text: string;
}
