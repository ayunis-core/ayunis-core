import type { OrgKnowledgeBase } from './org-knowledge-base.entity';
import type { PersonalKnowledgeBase } from './personal-knowledge-base.entity';
import type { TeamKnowledgeBase } from './team-knowledge-base.entity';
import type { WorkspaceKnowledgeBase } from './workspace-knowledge-base.entity';

export type CollectiveKnowledgeBase = TeamKnowledgeBase | OrgKnowledgeBase;

export type KnowledgeBase =
  PersonalKnowledgeBase | WorkspaceKnowledgeBase | CollectiveKnowledgeBase;
