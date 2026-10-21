import type {
  OwnerDescription,
  ResourceViewerRights,
} from 'src/domain/ownership/application/models/ownership-lookup';
import type { Skill } from 'src/domain/skills/domain/skill';

export interface SkillUserContext {
  isActive: boolean;
  isShared: boolean;
  isPinned: boolean;
}

export interface SkillContext<
  T extends Skill = Skill,
> extends SkillUserContext {
  skill: T;
  creatorName: string | null;
  viewer?: ResourceViewerRights;
  ownerDescription?: OwnerDescription;
}
