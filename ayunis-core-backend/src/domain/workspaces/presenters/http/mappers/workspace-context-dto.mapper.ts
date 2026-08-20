import { Injectable } from '@nestjs/common';
import type { Paginated } from 'src/common/pagination/paginated.entity';
import type { PaginationDto } from 'src/common/pagination/pagination.dto';
import type { WorkspaceSkillCandidate } from 'src/domain/workspaces/application/use-cases/list-workspace-skill-candidates/list-workspace-skill-candidates.use-case';
import type { WorkspaceKnowledgeBaseCandidate } from 'src/domain/workspaces/application/use-cases/list-workspace-knowledge-base-candidates/list-workspace-knowledge-base-candidates.use-case';
import type { Skill } from 'src/domain/skills/domain/skill.entity';
import type { Source } from 'src/domain/sources/domain/source.entity';
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
  WorkspaceDocumentListResponseDto,
  WorkspaceDocumentResponseDto,
  WorkspaceKnowledgeBaseCandidateListResponseDto,
  WorkspaceKnowledgeBaseCandidateResponseDto,
  WorkspaceKnowledgeBaseListResponseDto,
  WorkspaceKnowledgeBaseResponseDto,
  WorkspaceSkillCandidateListResponseDto,
  WorkspaceSkillCandidateResponseDto,
  WorkspaceSkillListResponseDto,
  WorkspaceSkillResponseDto,
} from 'src/domain/workspaces/presenters/http/dtos/workspace-context-response.dto';

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

  toSkillCandidateDto(
    candidate: WorkspaceSkillCandidate,
  ): WorkspaceSkillCandidateResponseDto {
    return {
      ...this.toSkillDto(candidate.skill),
      isAttached: candidate.isAttached,
    };
  }

  toKnowledgeBaseDto(
    knowledgeBase: WorkspaceKnowledgeBaseContext,
  ): WorkspaceKnowledgeBaseResponseDto {
    return this.toKnowledgeBaseResponseDto(
      knowledgeBase,
      knowledgeBase.documentCount,
    );
  }

  toKnowledgeBaseCandidateDto(
    candidate: WorkspaceKnowledgeBaseCandidate,
  ): WorkspaceKnowledgeBaseCandidateResponseDto {
    return {
      ...this.toKnowledgeBaseResponseDto(
        candidate.knowledgeBase,
        candidate.documentCount,
      ),
      isAttached: candidate.isAttached,
    };
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

  toSkillListDto(page: Paginated<Skill>): WorkspaceSkillListResponseDto {
    return {
      data: page.data.map((skill) => this.toSkillDto(skill)),
      pagination: this.toPaginationDto(page),
    };
  }

  toSkillCandidateListDto(
    page: Paginated<WorkspaceSkillCandidate>,
  ): WorkspaceSkillCandidateListResponseDto {
    return {
      data: page.data.map((candidate) => this.toSkillCandidateDto(candidate)),
      pagination: this.toPaginationDto(page),
    };
  }

  toKnowledgeBaseListDto(
    page: Paginated<WorkspaceKnowledgeBaseContext>,
  ): WorkspaceKnowledgeBaseListResponseDto {
    return {
      data: page.data.map((knowledgeBase) =>
        this.toKnowledgeBaseDto(knowledgeBase),
      ),
      pagination: this.toPaginationDto(page),
    };
  }

  toKnowledgeBaseCandidateListDto(
    page: Paginated<WorkspaceKnowledgeBaseCandidate>,
  ): WorkspaceKnowledgeBaseCandidateListResponseDto {
    return {
      data: page.data.map((candidate) =>
        this.toKnowledgeBaseCandidateDto(candidate),
      ),
      pagination: this.toPaginationDto(page),
    };
  }

  toDocumentListDto(page: Paginated<Source>): WorkspaceDocumentListResponseDto {
    return {
      data: page.data.map((source) => this.toDocumentDto(source)),
      pagination: this.toPaginationDto(page),
    };
  }

  private toKnowledgeBaseResponseDto(
    knowledgeBase: Pick<
      WorkspaceKnowledgeBaseContext,
      'id' | 'name' | 'description'
    >,
    documentCount: number,
  ): WorkspaceKnowledgeBaseResponseDto {
    const dto = new WorkspaceKnowledgeBaseResponseDto();
    dto.id = knowledgeBase.id;
    dto.name = knowledgeBase.name;
    dto.description = knowledgeBase.description;
    dto.documentCount = documentCount;
    return dto;
  }

  private toPaginationDto<T>(page: Paginated<T>): PaginationDto {
    return {
      limit: page.limit,
      offset: page.offset,
      total: page.total,
    };
  }
}
