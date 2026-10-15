import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import type {
  OwnerDescription,
  OwnershipLookup,
  ResourceViewerRights,
} from 'src/domain/ownership/application/models/ownership-lookup';
import type { OwnershipViewer } from 'src/domain/ownership/application/models/ownership-viewer';
import { BuildOwnershipLookupQuery } from 'src/domain/ownership/application/use-cases/build-ownership-lookup/build-ownership-lookup.query';
import { BuildOwnershipLookupUseCase } from 'src/domain/ownership/application/use-cases/build-ownership-lookup/build-ownership-lookup.use-case';
import {
  collectiveOwnerOfKnowledgeBase,
  isCollectiveKnowledgeBase,
} from 'src/domain/knowledge-bases/application/models/collective-knowledge-base-owner';
import { CollectiveKnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/collective-knowledge-base.repository';
import type {
  CollectiveKnowledgeBase,
  KnowledgeBase,
} from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';

export class KnowledgeBaseOwnershipLookup {
  constructor(
    private readonly lookup: OwnershipLookup,
    private readonly activeStates: Map<UUID, boolean>,
  ) {}

  get viewer(): OwnershipViewer {
    return this.lookup.viewer;
  }

  rightsFor(knowledgeBase: KnowledgeBase): ResourceViewerRights | undefined {
    if (isCollectiveKnowledgeBase(knowledgeBase)) {
      return this.lookup.rightsFor(
        collectiveOwnerOfKnowledgeBase(knowledgeBase),
      );
    }
    if (!(knowledgeBase instanceof PersonalKnowledgeBase)) return undefined;
    return this.lookup.rightsFor({
      type: 'personal',
      userId: knowledgeBase.userId,
    });
  }

  describe(knowledgeBase: KnowledgeBase): OwnerDescription | undefined {
    return isCollectiveKnowledgeBase(knowledgeBase)
      ? this.lookup.describe(collectiveOwnerOfKnowledgeBase(knowledgeBase))
      : undefined;
  }

  isActive(knowledgeBase: CollectiveKnowledgeBase): boolean {
    return this.activeStates.get(knowledgeBase.id) ?? true;
  }
}

@Injectable()
export class KnowledgeBaseOwnershipContextService {
  constructor(
    private readonly buildLookup: BuildOwnershipLookupUseCase,
    private readonly collectiveRepository: CollectiveKnowledgeBaseRepository,
  ) {}

  async lookup(
    knowledgeBases: KnowledgeBase[],
    viewer?: OwnershipViewer,
  ): Promise<KnowledgeBaseOwnershipLookup> {
    const collective = knowledgeBases.filter(isCollectiveKnowledgeBase);
    const lookup = await this.buildLookup.execute(
      new BuildOwnershipLookupQuery(
        'knowledge_base',
        collective.map(collectiveOwnerOfKnowledgeBase),
        viewer,
      ),
    );
    const activeStates =
      collective.length > 0
        ? await this.collectiveRepository.getActiveStates(
            collective.map(({ id }) => id),
            lookup.viewer.userId,
          )
        : new Map<UUID, boolean>();
    return new KnowledgeBaseOwnershipLookup(lookup, activeStates);
  }
}
