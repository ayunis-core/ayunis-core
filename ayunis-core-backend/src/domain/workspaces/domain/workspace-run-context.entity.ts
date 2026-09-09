import type { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';

import type { KnowledgeBaseSummary } from 'src/domain/knowledge-bases/domain/knowledge-base-summary';

export interface WorkspaceSkillContext {
  skill: WorkspaceSkill;
  isActive: boolean;
  isPinned: boolean;
}

export interface WorkspaceKnowledgeBaseContext extends KnowledgeBaseSummary {
  description: string | null;
  documentCount: number;
  isActive: boolean;
}

export interface WorkspaceRunContext {
  instruction: string | null;
  skills: WorkspaceSkillContext[];
  knowledgeBases: WorkspaceKnowledgeBaseContext[];
  runtimeKnowledgeBases: WorkspaceKnowledgeBaseContext[];
}
