import { Injectable } from '@nestjs/common';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import type { Source } from 'src/domain/sources/domain/source.entity';
import {
  FileSource,
  TextSource,
  UrlSource,
} from 'src/domain/sources/domain/sources/text-source.entity';
import type { KnowledgeBaseResponseDto } from 'src/domain/knowledge-bases/presenters/http/dto/knowledge-base-response.dto';
import type { KnowledgeBaseDocumentResponseDto } from 'src/domain/knowledge-bases/presenters/http/dto/knowledge-base-document-response.dto';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';

@Injectable()
export class KnowledgeBaseDtoMapper {
  toDto(
    entity: KnowledgeBase,
    context: {
      isActive: boolean;
      documentCount: number;
    },
  ): KnowledgeBaseResponseDto {
    return {
      id: entity.id,
      ...this.toOwner(entity),
      name: entity.name,
      description: entity.description,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      isActive: context.isActive,
      documentCount: context.documentCount,
    };
  }

  private toOwner(
    entity: KnowledgeBase,
  ): Pick<KnowledgeBaseResponseDto, 'ownerType' | 'workspaceId' | 'teamId'> {
    if (entity instanceof PersonalKnowledgeBase)
      return { ownerType: 'personal' };
    if (entity instanceof WorkspaceKnowledgeBase) {
      return { ownerType: 'workspace', workspaceId: entity.workspaceId };
    }
    if (entity instanceof TeamKnowledgeBase) {
      return { ownerType: 'team', teamId: entity.teamId };
    }
    return { ownerType: 'org' };
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
    if (source.processingErrorCode) {
      dto.processingErrorCode = source.processingErrorCode;
    }

    if (source instanceof TextSource) {
      dto.textType = source.textType;
    }

    if (
      source instanceof UrlSource ||
      (source instanceof FileSource && source.url)
    ) {
      dto.url = source.url ?? undefined;
    }

    return dto;
  }
}
