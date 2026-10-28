import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { BaseSkillDto } from './base-skill.dto';
import { SkillOwnerDto } from './skill-owner.dto';

class ConcreteSkillOwnerDto extends SkillOwnerDto {}

export class CreateSkillDto extends IntersectionType(
  BaseSkillDto,
  ConcreteSkillOwnerDto,
) {
  @ApiPropertyOptional({
    description: 'Whether a personal skill is active (defaults to true)',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
