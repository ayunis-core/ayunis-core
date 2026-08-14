import { Injectable } from '@nestjs/common';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { Source } from 'src/domain/sources/domain/source.entity';
import {
  TextSource,
  UrlSource,
} from 'src/domain/sources/domain/sources/text-source.entity';
import type {
  WorkspaceKnowledgeBaseContext,
  WorkspaceRunContext,
} from 'src/domain/workspaces/domain/workspace-run-context.entity';
import {
  WorkspaceContextResponseDto,
  WorkspaceDocumentResponseDto,
  WorkspaceKnowledgeBaseResponseDto,
  WorkspaceSkillResponseDto,
} from '../dtos/workspace-context-response.dto';

@Injectable()
export class WorkspaceContextDtoMapper {
  toContextDto(context: WorkspaceRunContext): WorkspaceContextResponseDto {
    const dto = new WorkspaceContextResponseDto();
    dto.instruction = context.instruction;
    dto.skills = context.skills.map((skill) => this.toSkillDto(skill));
    dto.knowledgeBases = context.knowledgeBases.map((knowledgeBase) =>
      this.toKnowledgeBaseDto(knowledgeBase),
    );
    dto.documents = context.sources.map((source) => this.toDocumentDto(source));
    return dto;
  }

  toSkillDto(skill: Skill): WorkspaceSkillResponseDto {
    const dto = new WorkspaceSkillResponseDto();
    dto.id = skill.id;
    dto.name = skill.name;
    dto.shortDescription = skill.shortDescription;
    return dto;
  }

  toKnowledgeBaseDto(
    knowledgeBase: WorkspaceKnowledgeBaseContext,
  ): WorkspaceKnowledgeBaseResponseDto {
    const dto = new WorkspaceKnowledgeBaseResponseDto();
    dto.id = knowledgeBase.id;
    dto.name = knowledgeBase.name;
    dto.description = knowledgeBase.description;
    dto.documentCount = knowledgeBase.documentCount;
    return dto;
  }

  toDocumentDto(source: Source): WorkspaceDocumentResponseDto {
    const dto = new WorkspaceDocumentResponseDto();
    dto.id = source.id;
    dto.name = source.name;
    dto.type = source.type;
    dto.createdBy = source.createdBy;
    dto.status = source.status;
    dto.processingError = source.processingError;
    dto.createdAt = source.createdAt.toISOString();
    dto.updatedAt = source.updatedAt.toISOString();
    if (source instanceof TextSource) {
      dto.textType = source.textType;
      if (source instanceof UrlSource) dto.url = source.url;
    }
    return dto;
  }
}
