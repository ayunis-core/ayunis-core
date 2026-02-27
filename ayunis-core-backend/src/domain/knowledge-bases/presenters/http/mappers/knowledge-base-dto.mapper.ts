import { Injectable } from '@nestjs/common';
import type { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import type { Source } from 'src/domain/sources/domain/source.entity';
import {
  TextSource,
  UrlSource,
} from 'src/domain/sources/domain/sources/text-source.entity';
import type { KnowledgeBaseResponseDto } from '../dto/knowledge-base-response.dto';
import type { KnowledgeBaseDocumentResponseDto } from '../dto/knowledge-base-document-response.dto';

@Injectable()
export class KnowledgeBaseDtoMapper {
  toDto(
    entity: KnowledgeBase,
    isShared: boolean = false,
  ): KnowledgeBaseResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      isShared,
    };
  }

  toDtoArray(entities: KnowledgeBase[]): KnowledgeBaseResponseDto[] {
    return entities.map((entity) => this.toDto(entity));
  }

  toDocumentDto(source: Source): KnowledgeBaseDocumentResponseDto {
    const dto: KnowledgeBaseDocumentResponseDto = {
      id: source.id,
      name: source.name,
      type: source.type,
      createdBy: source.createdBy,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString(),
    };

    if (source instanceof TextSource) {
      dto.textType = source.textType;
    }

    if (source instanceof UrlSource) {
      dto.url = source.url;
    }

    return dto;
  }
}
