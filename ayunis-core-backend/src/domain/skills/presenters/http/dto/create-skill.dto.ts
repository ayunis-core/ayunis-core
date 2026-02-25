import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { BaseSkillDto } from './base-skill.dto';

export class CreateSkillDto extends BaseSkillDto {
  @ApiPropertyOptional({
    description: 'Whether the skill is active (defaults to true)',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
