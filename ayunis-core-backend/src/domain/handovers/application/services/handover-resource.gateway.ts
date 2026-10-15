import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandoverNotAllowedError } from 'src/domain/handovers/application/handovers.errors';
import { HandoverResourceType } from 'src/domain/handovers/domain/handover-resource-type.enum';
import type { HandoverTarget } from 'src/domain/handovers/domain/handover-target';
import { FindKnowledgeBaseQuery } from 'src/domain/knowledge-bases/application/use-cases/find-knowledge-base/find-knowledge-base.query';
import { FindKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-knowledge-base/find-knowledge-base.use-case';
import { TransferKnowledgeBaseOwnershipCommand } from 'src/domain/knowledge-bases/application/use-cases/transfer-knowledge-base-ownership/transfer-knowledge-base-ownership.command';
import { TransferKnowledgeBaseOwnershipUseCase } from 'src/domain/knowledge-bases/application/use-cases/transfer-knowledge-base-ownership/transfer-knowledge-base-ownership.use-case';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { FindOneSkillQuery } from 'src/domain/skills/application/use-cases/find-one-skill/find-one-skill.query';
import { FindOneSkillUseCase } from 'src/domain/skills/application/use-cases/find-one-skill/find-one-skill.use-case';
import { TransferSkillOwnershipCommand } from 'src/domain/skills/application/use-cases/transfer-skill-ownership/transfer-skill-ownership.command';
import { TransferSkillOwnershipUseCase } from 'src/domain/skills/application/use-cases/transfer-skill-ownership/transfer-skill-ownership.use-case';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';

@Injectable()
export class HandoverResourceGateway {
  constructor(
    @Inject(forwardRef(() => FindOneSkillUseCase))
    private readonly findOneSkill: FindOneSkillUseCase,
    @Inject(forwardRef(() => FindKnowledgeBaseUseCase))
    private readonly findKnowledgeBase: FindKnowledgeBaseUseCase,
    @Inject(forwardRef(() => TransferSkillOwnershipUseCase))
    private readonly transferSkill: TransferSkillOwnershipUseCase,
    @Inject(forwardRef(() => TransferKnowledgeBaseOwnershipUseCase))
    private readonly transferKnowledgeBase: TransferKnowledgeBaseOwnershipUseCase,
  ) {}

  async requireOwnItem(
    kind: HandoverResourceType,
    resourceId: UUID,
    userId: UUID,
  ): Promise<void> {
    const ownsItem =
      kind === HandoverResourceType.SKILL
        ? await this.ownsSkill(resourceId, userId)
        : await this.ownsKnowledgeBase(resourceId, userId);
    if (!ownsItem) {
      throw new HandoverNotAllowedError(
        'Only the owner can hand over a personal item',
      );
    }
  }

  async transfer(params: {
    kind: HandoverResourceType;
    resourceId: UUID;
    requesterId: UUID;
    orgId: UUID;
    target: HandoverTarget;
  }): Promise<void> {
    if (params.kind === HandoverResourceType.SKILL) {
      await this.transferSkill.execute(
        new TransferSkillOwnershipCommand(
          params.resourceId,
          params.requesterId,
          params.orgId,
          params.target,
        ),
      );
      return;
    }
    await this.transferKnowledgeBase.execute(
      new TransferKnowledgeBaseOwnershipCommand(
        params.resourceId,
        params.requesterId,
        params.target,
      ),
    );
  }

  private async ownsSkill(skillId: UUID, userId: UUID): Promise<boolean> {
    const { skill } = await this.findOneSkill.execute(
      new FindOneSkillQuery(skillId),
    );
    return skill instanceof PersonalSkill && skill.userId === userId;
  }

  private async ownsKnowledgeBase(
    knowledgeBaseId: UUID,
    userId: UUID,
  ): Promise<boolean> {
    const { knowledgeBase } = await this.findKnowledgeBase.execute(
      new FindKnowledgeBaseQuery(knowledgeBaseId),
    );
    return (
      knowledgeBase instanceof PersonalKnowledgeBase &&
      knowledgeBase.userId === userId
    );
  }
}
