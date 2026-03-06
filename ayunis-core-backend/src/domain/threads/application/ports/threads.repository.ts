import type { SourceAssignment } from '../../domain/thread-source-assignment.entity';
import type { Thread } from '../../domain/thread.entity';
import type { UUID } from 'crypto';
import type { Paginated } from 'src/common/pagination/paginated.entity';

export interface ThreadsFindAllOptions {
  withSources?: boolean;
  withMessages?: boolean;
  withModel?: boolean;
  withKnowledgeBases?: boolean;
}

export interface ThreadsFindAllFilters {
  search?: string;
  agentId?: string;
}

export interface ThreadsPagination {
  limit: number;
  offset: number;
}

export abstract class ThreadsRepository {
  abstract create(thread: Thread): Promise<Thread>;
  abstract findOne(id: UUID, userId: UUID): Promise<Thread | null>;
  abstract findAll(
    userId: UUID,
    options?: ThreadsFindAllOptions,
    filters?: ThreadsFindAllFilters,
    pagination?: ThreadsPagination,
  ): Promise<Paginated<Thread>>;
  abstract findAllByModel(
    modelId: UUID,
    options?: ThreadsFindAllOptions,
  ): Promise<Thread[]>;
  abstract findAllByAgent(
    agentId: UUID,
    options?: ThreadsFindAllOptions,
  ): Promise<Thread[]>;
  abstract update(thread: Thread): Promise<Thread>;
  abstract updateModel(params: {
    threadId: UUID;
    userId: UUID;
    permittedModelId: UUID;
  }): Promise<void>;
  abstract updateTitle(params: {
    threadId: UUID;
    userId: UUID;
    title: string;
  }): Promise<void>;
  abstract updateSourceAssignments(params: {
    threadId: UUID;
    userId: UUID;
    sourceAssignments: SourceAssignment[];
  }): Promise<void>;
  abstract updateMcpIntegrations(params: {
    threadId: UUID;
    userId: UUID;
    mcpIntegrationIds: UUID[];
  }): Promise<void>;
  abstract addKnowledgeBaseAssignment(params: {
    threadId: UUID;
    userId: UUID;
    knowledgeBaseId: UUID;
    originSkillId?: UUID;
  }): Promise<void>;
  abstract removeKnowledgeBaseAssignment(params: {
    threadId: UUID;
    userId: UUID;
    knowledgeBaseId: UUID;
    originSkillId?: UUID;
  }): Promise<void>;
  abstract delete(id: UUID, userId: UUID): Promise<void>;
  abstract findAllByOrgIdWithSources(orgId: UUID): Promise<Thread[]>;
  abstract removeSourceAssignmentsByOriginSkill(params: {
    originSkillId: UUID;
    userIds: UUID[];
  }): Promise<void>;
  abstract removeKnowledgeBaseAssignmentsByOriginSkill(params: {
    originSkillId: UUID;
    userIds: UUID[];
    knowledgeBaseId?: UUID;
  }): Promise<void>;
  abstract removeDirectKnowledgeBaseAssignments(params: {
    knowledgeBaseId: UUID;
    userIds: UUID[];
  }): Promise<void>;
}
