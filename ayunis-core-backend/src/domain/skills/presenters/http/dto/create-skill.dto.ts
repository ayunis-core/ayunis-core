import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { BaseSkillDto } from './base-skill.dto';
import { CreateSkillOwnerDto } from './create-skill-owner.dto';

class ConcreteSkillOwnerDto extends CreateSkillOwnerDto {}

export class CreateSkillDto extends IntersectionType(
  BaseSkillDto,
  ConcreteSkillOwnerDto,
) {
  @ApiPropertyOptional({
    description:
      'Whether the skill is active for its owner, or for the creator of a team or organisation skill (defaults to true)',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
