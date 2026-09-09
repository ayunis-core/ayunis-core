import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  DocumentNotInKnowledgeBaseError,
  KnowledgeBaseNotFoundError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { GetKnowledgeBaseDocumentTextQuery } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-base-document-text/get-knowledge-base-document-text.query';
import { GetKnowledgeBaseDocumentTextUseCase } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-base-document-text/get-knowledge-base-document-text.use-case';
import {
  SourceCitationNotFoundError,
  UnexpectedRunError,
} from 'src/domain/runs/application/runs.errors';
import { FindOneSkillQuery } from 'src/domain/skills/application/use-cases/find-one-skill/find-one-skill.query';
import { FindOneSkillUseCase } from 'src/domain/skills/application/use-cases/find-one-skill/find-one-skill.use-case';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import type { SourceCitationTarget } from 'src/domain/sources/application/models/source-citation-target';
import { FindSourceCitationTargetQuery } from 'src/domain/sources/application/use-cases/find-source-citation-target/find-source-citation-target.query';
import { FindSourceCitationTargetUseCase } from 'src/domain/sources/application/use-cases/find-source-citation-target/find-source-citation-target.use-case';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import type { ThreadCitationContext } from 'src/domain/threads/application/models/thread-citation-context';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import { FindThreadCitationContextQuery } from 'src/domain/threads/application/use-cases/find-thread-citation-context/find-thread-citation-context.query';
import { FindThreadCitationContextUseCase } from 'src/domain/threads/application/use-cases/find-thread-citation-context/find-thread-citation-context.use-case';
import { BuildWorkspaceRunContextQuery } from 'src/domain/workspaces/application/use-cases/build-workspace-run-context/build-workspace-run-context.query';
import { BuildWorkspaceRunContextUseCase } from 'src/domain/workspaces/application/use-cases/build-workspace-run-context/build-workspace-run-context.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import type { WorkspaceRunContext } from 'src/domain/workspaces/domain/workspace-run-context.entity';
import { GetThreadSourceCitationQuery } from './get-thread-source-citation.query';

export interface ThreadSourceCitation {
  chunk: {
    id: string;
    content: string;
    startLine: number | null;
    endLine: number | null;
  };
  source: { id: string; name: string; url: string | null };
}

@Injectable()
export class GetThreadSourceCitationUseCase {
  private readonly logger = new Logger(GetThreadSourceCitationUseCase.name);

  constructor(
    private readonly findThreadCitationContextUseCase: FindThreadCitationContextUseCase,
    private readonly findCitationTargetUseCase: FindSourceCitationTargetUseCase,
    private readonly findOneSkillUseCase: FindOneSkillUseCase,
    private readonly getKnowledgeBaseDocumentTextUseCase: GetKnowledgeBaseDocumentTextUseCase,
    private readonly buildWorkspaceRunContextUseCase: BuildWorkspaceRunContextUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRunError)
  async execute(
    query: GetThreadSourceCitationQuery,
  ): Promise<ThreadSourceCitation> {
    this.logger.log(query, 'Getting thread source citation');
    const thread = await this.findOwnedThreadContext(query.threadId);
    const target = await this.findCitationTargetUseCase.execute(
      new FindSourceCitationTargetQuery(query.chunkId),
    );
    if (!target || !this.isVisibleTarget(target)) {
      throw new SourceCitationNotFoundError();
    }
    if (!(await this.isAvailable(thread, target, query.orgId))) {
      throw new SourceCitationNotFoundError();
    }
    return this.toResult(target);
  }

  private async findOwnedThreadContext(
    threadId: UUID,
  ): Promise<ThreadCitationContext> {
    try {
      return await this.findThreadCitationContextUseCase.execute(
        new FindThreadCitationContextQuery(threadId),
      );
    } catch (error) {
      if (error instanceof ThreadNotFoundError) {
        throw new SourceCitationNotFoundError();
      }
      throw error;
    }
  }

  private async isAvailable(
    thread: ThreadCitationContext,
    target: SourceCitationTarget,
    orgId: UUID,
  ): Promise<boolean> {
    if (this.hasDirectSourceAssignment(thread, target.source.id)) return true;
    if (await this.hasAccessibleSkillSource(thread, target.source.id)) {
      return true;
    }
    if (await this.hasAccessibleKnowledgeBaseDocument(thread, target, orgId)) {
      return true;
    }
    const workspace = await this.buildWorkspaceContext(thread);
    return this.isAvailableToWorkspace(workspace, target.source);
  }

  private hasDirectSourceAssignment(
    thread: ThreadCitationContext,
    sourceId: UUID,
  ): boolean {
    return thread.sourceAssignments.some(
      (assignment) =>
        assignment.sourceId === sourceId && !assignment.originSkillId,
    );
  }

  private async hasAccessibleSkillSource(
    thread: ThreadCitationContext,
    sourceId: UUID,
  ): Promise<boolean> {
    const skillIds = thread.sourceAssignments
      .filter((assignment) => assignment.sourceId === sourceId)
      .flatMap((assignment) =>
        assignment.originSkillId ? [assignment.originSkillId] : [],
      );
    for (const skillId of new Set(skillIds)) {
      if (await this.skillContainsSource(skillId, sourceId)) return true;
    }
    return false;
  }

  private async skillContainsSource(
    skillId: UUID,
    sourceId: UUID,
  ): Promise<boolean> {
    try {
      const { skill } = await this.findOneSkillUseCase.execute(
        new FindOneSkillQuery(skillId),
      );
      return skill.sourceIds.includes(sourceId);
    } catch (error) {
      if (error instanceof SkillNotFoundError) return false;
      throw error;
    }
  }

  private async hasAccessibleKnowledgeBaseDocument(
    thread: ThreadCitationContext,
    target: SourceCitationTarget,
    orgId: UUID,
  ): Promise<boolean> {
    const knowledgeBaseId = target.source.knowledgeBaseId;
    if (
      !knowledgeBaseId ||
      !this.hasKnowledgeBaseAssignment(thread, knowledgeBaseId)
    ) {
      return false;
    }
    try {
      await this.getKnowledgeBaseDocumentTextUseCase.execute(
        new GetKnowledgeBaseDocumentTextQuery({
          knowledgeBaseId,
          documentId: target.source.id,
          orgId,
          userId: thread.userId,
        }),
      );
      return true;
    } catch (error) {
      if (
        error instanceof KnowledgeBaseNotFoundError ||
        error instanceof DocumentNotInKnowledgeBaseError
      ) {
        return false;
      }
      throw error;
    }
  }

  private hasKnowledgeBaseAssignment(
    thread: ThreadCitationContext,
    knowledgeBaseId: UUID,
  ): boolean {
    return thread.knowledgeBaseAssignments.some(
      (assignment) => assignment.knowledgeBaseId === knowledgeBaseId,
    );
  }

  private async buildWorkspaceContext(
    thread: ThreadCitationContext,
  ): Promise<WorkspaceRunContext | undefined> {
    if (!thread.workspaceId) return undefined;
    try {
      return await this.buildWorkspaceRunContextUseCase.execute(
        new BuildWorkspaceRunContextQuery(thread.workspaceId),
      );
    } catch (error) {
      if (error instanceof WorkspaceNotFoundError) return undefined;
      throw error;
    }
  }

  private isAvailableToWorkspace(
    workspace: WorkspaceRunContext | undefined,
    source: { id: UUID; knowledgeBaseId: UUID | null },
  ): boolean {
    if (workspace?.runtimeSources.some((item) => item.id === source.id)) {
      return true;
    }
    return Boolean(
      source.knowledgeBaseId &&
      workspace?.runtimeKnowledgeBases.some(
        (knowledgeBase) => knowledgeBase.id === source.knowledgeBaseId,
      ),
    );
  }

  private isVisibleTarget(target: SourceCitationTarget): boolean {
    return (
      target.source.createdBy !== SourceCreator.SYSTEM &&
      target.source.status === SourceStatus.READY
    );
  }

  private toResult(target: SourceCitationTarget): ThreadSourceCitation {
    return {
      chunk: {
        id: target.chunk.id,
        content: target.chunk.content,
        startLine: this.numberMeta(target.chunk.meta.startLine),
        endLine: this.numberMeta(target.chunk.meta.endLine),
      },
      source: {
        id: target.source.id,
        name: target.source.name,
        url: this.stringMeta(target.chunk.meta.url) ?? target.source.url,
      },
    };
  }

  private numberMeta(value: unknown): number | null {
    return typeof value === 'number' ? value : null;
  }

  private stringMeta(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }
}
