import type { UUID } from 'crypto';

export interface ThreadAiContextSkill {
  id: UUID;
  name: string;
  shortDescription: string;
  workspaceId: UUID | null;
}

export interface ThreadAiContextKnowledgeBase {
  id: UUID;
  name: string;
  documentCount: number;
  workspaceId: UUID | null;
}

export interface ThreadAiContext {
  skills: ThreadAiContextSkill[];
  knowledgeBases: ThreadAiContextKnowledgeBase[];
}
