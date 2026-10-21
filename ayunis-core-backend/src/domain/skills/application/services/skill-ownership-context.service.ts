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
  collectiveOwnerOf,
  isCollectiveSkill,
} from 'src/domain/skills/application/models/collective-skill-owner';
import {
  CollectiveSkillRepository,
  type CollectiveSkillState,
} from 'src/domain/skills/application/ports/collective-skill.repository';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { CollectiveSkill, Skill } from 'src/domain/skills/domain/skill';

export class SkillOwnershipLookup {
  constructor(
    private readonly lookup: OwnershipLookup,
    private readonly states: Map<UUID, CollectiveSkillState>,
  ) {}

  rightsFor(skill: Skill): ResourceViewerRights | undefined {
    if (isCollectiveSkill(skill)) {
      return this.lookup.rightsFor(collectiveOwnerOf(skill));
    }
    if (!(skill instanceof PersonalSkill)) return undefined;
    return this.lookup.rightsFor({ type: 'personal', userId: skill.userId });
  }

  describe(skill: Skill): OwnerDescription | undefined {
    return isCollectiveSkill(skill)
      ? this.lookup.describe(collectiveOwnerOf(skill), skill.submittedByUserId)
      : undefined;
  }

  stateOf(skill: CollectiveSkill): CollectiveSkillState {
    return this.states.get(skill.id) ?? { isActive: true, isPinned: false };
  }
}

@Injectable()
export class SkillOwnershipContextService {
  constructor(
    private readonly buildLookup: BuildOwnershipLookupUseCase,
    private readonly collectiveRepository: CollectiveSkillRepository,
  ) {}

  async lookup(
    skills: Skill[],
    viewer?: OwnershipViewer,
  ): Promise<SkillOwnershipLookup> {
    const collective = skills.filter(isCollectiveSkill);
    const lookup = await this.buildLookup.execute(
      new BuildOwnershipLookupQuery(
        'skill',
        collective.map(collectiveOwnerOf),
        viewer,
        collective.flatMap(({ submittedByUserId }) =>
          submittedByUserId ? [submittedByUserId] : [],
        ),
      ),
    );
    const states =
      collective.length > 0
        ? await this.collectiveRepository.getStates(
            collective.map(({ id }) => id),
            lookup.viewer.userId,
          )
        : new Map<UUID, CollectiveSkillState>();
    return new SkillOwnershipLookup(lookup, states);
  }
}
