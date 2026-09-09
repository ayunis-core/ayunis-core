import { Injectable } from '@nestjs/common';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import type { Source } from 'src/domain/sources/domain/source.entity';
import {
  TextSource,
  UrlSource,
} from 'src/domain/sources/domain/sources/text-source.entity';
import type { KnowledgeBaseResponseDto } from 'src/domain/knowledge-bases/presenters/http/dto/knowledge-base-response.dto';
import type { KnowledgeBaseDocumentResponseDto } from 'src/domain/knowledge-bases/presenters/http/dto/knowledge-base-document-response.dto';

@Injectable()
export class KnowledgeBaseDtoMapper {
  toDto(
    entity: KnowledgeBase,
    context: { isActive: boolean; isShared?: boolean },
  ): KnowledgeBaseResponseDto {
    const dto: KnowledgeBaseResponseDto = {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      isActive: context.isActive,
    };
    if (context.isShared !== undefined) {
      dto.isShared = context.isShared;
    }
    return dto;
  }

  toDocumentDto(source: Source): KnowledgeBaseDocumentResponseDto {
    const dto: KnowledgeBaseDocumentResponseDto = {
      id: source.id,
      name: source.name,
      type: source.type,
      createdBy: source.createdBy,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString(),
      status: source.status,
    };

    if (source.processingError) {
      dto.processingError = source.processingError;
    }

    if (source instanceof TextSource) {
      dto.textType = source.textType;
    }

    if (source instanceof UrlSource) {
      dto.url = source.url;
    }

    return dto;
  }
}
