import type { Tool } from '@ayunis/agent-runtime';

export interface SkillSummary {
  readonly name: string;
  readonly description: string;
}

export interface SkillDefinition extends SkillSummary {
  readonly instructions: string;
  readonly tools?: readonly Tool[];
}

export interface SkillSource {
  list(): Promise<readonly SkillSummary[]>;
  load(name: string): Promise<SkillDefinition>;
}
