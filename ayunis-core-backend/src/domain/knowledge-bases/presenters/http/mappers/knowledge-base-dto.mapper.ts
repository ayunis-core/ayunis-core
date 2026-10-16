import { Injectable } from '@nestjs/common';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import type {
  OwnerDescription,
  ResourceViewerRights,
} from 'src/domain/ownership/application/models/ownership-lookup';
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
    context: {
      isActive: boolean;
      isShared?: boolean;
      documentCount: number;
      viewer?: ResourceViewerRights;
      ownerDescription?: OwnerDescription;
    },
  ): KnowledgeBaseResponseDto {
    const dto: KnowledgeBaseResponseDto = {
      id: entity.id,
      ...this.ownerFields(entity),
      ...(context.viewer && {
        viewer: { ...context.viewer, canDelete: context.viewer.canEdit },
      }),
      ...(context.ownerDescription && {
        ownerDescription: context.ownerDescription,
      }),
      name: entity.name,
      description: entity.description,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      isActive: context.isActive,
      documentCount: context.documentCount,
    };
    if (context.isShared !== undefined) {
      dto.isShared = context.isShared;
    }
    return dto;
  }

  private ownerFields(
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

    if (source instanceof TextSource) {
      dto.textType = source.textType;
    }

    if (source instanceof UrlSource) {
      dto.url = source.url;
    }

    return dto;
  }
}
