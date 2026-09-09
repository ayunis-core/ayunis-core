import { Injectable } from '@nestjs/common';
import type { Paginated } from 'src/common/pagination/paginated.entity';
import type { PaginationDto } from 'src/common/pagination/pagination.dto';
import type {
  WorkspaceKnowledgeBaseContext,
  WorkspaceRunContext,
  WorkspaceSkillContext,
} from 'src/domain/workspaces/domain/workspace-run-context.entity';
import {
  WorkspaceContextResponseDto,
  WorkspaceKnowledgeBaseResponseDto,
  WorkspaceSkillListResponseDto,
  WorkspaceSkillResponseDto,
} from 'src/domain/workspaces/presenters/http/dtos/workspace-context-response.dto';

@Injectable()
export class WorkspaceContextDtoMapper {
  toContextDto(context: WorkspaceRunContext): WorkspaceContextResponseDto {
    const dto = new WorkspaceContextResponseDto();
    dto.instruction = context.instruction;
    dto.skills = context.skills.map((skillContext) =>
      this.toSkillDto(skillContext),
    );
    dto.knowledgeBases = context.knowledgeBases.map((knowledgeBase) =>
      this.toKnowledgeBaseDto(knowledgeBase),
    );
    return dto;
  }

  toSkillDto(context: WorkspaceSkillContext): WorkspaceSkillResponseDto {
    const { skill } = context;
    const dto = new WorkspaceSkillResponseDto();
    dto.id = skill.id;
    dto.name = skill.name;
    dto.shortDescription = skill.shortDescription;
    dto.instructions = skill.instructions;
    dto.knowledgeBaseIds = skill.knowledgeBaseIds;
    dto.workspaceId = skill.workspaceId!;
    dto.isActive = context.isActive;
    dto.isPinned = context.isPinned;
    return dto;
  }

  toKnowledgeBaseDto(
    knowledgeBase: WorkspaceKnowledgeBaseContext,
  ): WorkspaceKnowledgeBaseResponseDto {
    return this.toKnowledgeBaseResponseDto(
      knowledgeBase,
      knowledgeBase.documentCount,
    );
  }

  toSkillListDto(
    page: Paginated<WorkspaceSkillContext>,
  ): WorkspaceSkillListResponseDto {
    return {
      data: page.data.map((skill) => this.toSkillDto(skill)),
      pagination: this.toPaginationDto(page),
    };
  }

  private toKnowledgeBaseResponseDto(
    knowledgeBase: Pick<
      WorkspaceKnowledgeBaseContext,
      'id' | 'name' | 'description' | 'isActive'
    >,
    documentCount: number,
  ): WorkspaceKnowledgeBaseResponseDto {
    const dto = new WorkspaceKnowledgeBaseResponseDto();
    dto.id = knowledgeBase.id;
    dto.name = knowledgeBase.name;
    dto.description = knowledgeBase.description;
    dto.documentCount = documentCount;
    dto.isActive = knowledgeBase.isActive;
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
