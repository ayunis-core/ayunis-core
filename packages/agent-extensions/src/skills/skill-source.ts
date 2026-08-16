import type { SkillDefinition, SkillSummary } from './skill-definition';

export type { SkillDefinition, SkillSummary } from './skill-definition';

export interface SkillSource {
  list(): Promise<readonly SkillSummary[]>;
  load(name: string): Promise<SkillDefinition>;
}
