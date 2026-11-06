import { AbstractSkill, type SkillParams } from './abstract-skill.entity';

export interface CollectiveSkillState {
  isActive: boolean;
  isPinned: boolean;
}

export type CollectiveSkillParams = SkillParams & Partial<CollectiveSkillState>;

/**
 * A skill owned by a team or the organization. Its activation and pin are
 * global: they apply to every user with access, so they live on the skill
 * instead of in per-user activation rows.
 */
export abstract class AbstractCollectiveSkill extends AbstractSkill {
  public readonly isActive: boolean;
  public readonly isPinned: boolean;

  protected constructor(params: CollectiveSkillParams) {
    super(params);
    this.isActive = params.isActive ?? false;
    this.isPinned = this.isActive && (params.isPinned ?? false);
  }

  abstract withUpdates(
    params: Partial<CollectiveSkillParams>,
  ): AbstractCollectiveSkill;

  withState(state: Partial<CollectiveSkillState>): this {
    return this.withUpdates({
      isActive: state.isActive ?? this.isActive,
      isPinned: state.isPinned ?? this.isPinned,
      updatedAt: new Date(),
    }) as this;
  }
}
