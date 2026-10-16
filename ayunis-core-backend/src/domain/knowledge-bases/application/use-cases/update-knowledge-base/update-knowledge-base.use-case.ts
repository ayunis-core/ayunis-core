import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
import type { AbstractKnowledgeBaseParams } from 'src/domain/knowledge-bases/domain/abstract-knowledge-base.entity';
import { UpdateKnowledgeBaseCommand } from './update-knowledge-base.command';

@Injectable()
export class UpdateKnowledgeBaseUseCase {
  private readonly logger = new Logger(UpdateKnowledgeBaseUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly writeAccess: KnowledgeBaseWriteAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(command: UpdateKnowledgeBaseCommand): Promise<KnowledgeBase> {
    this.logger.log(
      { knowledgeBaseId: command.knowledgeBaseId },
      'Updating knowledge base',
    );
    const existing = await this.repository.findById(command.knowledgeBaseId);
    if (!existing) {
      throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
    }
    await this.writeAccess.requireManage(existing);

    const params = {
      id: existing.id,
      name: command.name ?? existing.name,
      description: command.description ?? existing.description,
      orgId: existing.orgId,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };
    return this.repository.save(withSameOwner(existing, params));
  }
}

function withSameOwner(
  existing: KnowledgeBase,
  params: AbstractKnowledgeBaseParams,
): KnowledgeBase {
  if (existing instanceof PersonalKnowledgeBase) {
    return new PersonalKnowledgeBase({ ...params, userId: existing.userId });
  }
  if (existing instanceof WorkspaceKnowledgeBase) {
    return new WorkspaceKnowledgeBase({
      ...params,
      workspaceId: existing.workspaceId,
    });
  }
  if (existing instanceof TeamKnowledgeBase) {
    return new TeamKnowledgeBase({ ...params, teamId: existing.teamId });
  }
  return new OrgKnowledgeBase(params);
}
