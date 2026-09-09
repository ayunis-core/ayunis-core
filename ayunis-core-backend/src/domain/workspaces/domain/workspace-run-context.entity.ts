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

export interface WorkspaceAiContext {
  instruction: string | null;
  skills: WorkspaceSkillContext[];
  knowledgeBases: WorkspaceKnowledgeBaseContext[];
}

export interface WorkspaceRunContext extends WorkspaceAiContext {
  runtimeKnowledgeBases: WorkspaceKnowledgeBaseContext[];
}
