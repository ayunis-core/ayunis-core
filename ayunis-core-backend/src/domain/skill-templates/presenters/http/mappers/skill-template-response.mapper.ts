import { Injectable } from '@nestjs/common';
import type { SkillTemplate } from '../../../domain/skill-template.entity';
import { SkillTemplateResponseDto } from '../dto/skill-template-response.dto';

@Injectable()
export class SkillTemplateResponseMapper {
  toDto(entity: SkillTemplate): SkillTemplateResponseDto {
    const dto = new SkillTemplateResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.shortDescription = entity.shortDescription;
    dto.instructions = entity.instructions;
    dto.distributionMode = entity.distributionMode;
    dto.isActive = entity.isActive;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }

  toDtoArray(entities: SkillTemplate[]): SkillTemplateResponseDto[] {
    return entities.map((entity) => this.toDto(entity));
  }
}
