import type { SkillDefinition, SkillSummary } from './skill-definition';

export type { SkillDefinition, SkillSummary } from './skill-definition';

export interface SkillLoadOptions {
  readonly signal?: AbortSignal;
}

export interface SkillSource {
  list(): Promise<readonly SkillSummary[]>;
  load(name: string, options?: SkillLoadOptions): Promise<SkillDefinition>;
}
