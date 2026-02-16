import { Injectable } from '@nestjs/common';
import { Skill } from '../../../domain/skill.entity';
import {
  SkillResponseDto,
  SkillSourceResponseDto,
} from '../dto/skill-response.dto';
import { Source } from 'src/domain/sources/domain/source.entity';

@Injectable()
export class SkillDtoMapper {
  toDto(skill: Skill, isActive: boolean): SkillResponseDto {
    return {
      id: skill.id,
      name: skill.name,
      shortDescription: skill.shortDescription,
      instructions: skill.instructions,
      isActive,
      userId: skill.userId,
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt,
    };
  }

  toDtoArray(skills: Skill[], activeSkillIds: Set<string>): SkillResponseDto[] {
    return skills.map((skill) =>
      this.toDto(skill, activeSkillIds.has(skill.id)),
    );
  }

  sourceToDto(source: Source): SkillSourceResponseDto {
    return {
      id: source.id,
      name: source.name,
      type: source.type,
    };
  }

  sourcesToDtoArray(sources: Source[]): SkillSourceResponseDto[] {
    return sources.map((source) => this.sourceToDto(source));
  }
}
