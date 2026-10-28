import type { PersonalKnowledgeBase } from './personal-knowledge-base.entity';
import type { WorkspaceKnowledgeBase } from './workspace-knowledge-base.entity';

export type KnowledgeBase = PersonalKnowledgeBase | WorkspaceKnowledgeBase;
