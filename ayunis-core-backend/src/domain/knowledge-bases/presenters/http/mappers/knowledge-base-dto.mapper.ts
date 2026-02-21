import { Injectable } from '@nestjs/common';
import type { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import type { KnowledgeBaseResponseDto } from '../dto/knowledge-base-response.dto';

@Injectable()
export class KnowledgeBaseDtoMapper {
  toDto(entity: KnowledgeBase): KnowledgeBaseResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  toDtoArray(entities: KnowledgeBase[]): KnowledgeBaseResponseDto[] {
    return entities.map((entity) => this.toDto(entity));
  }
}
