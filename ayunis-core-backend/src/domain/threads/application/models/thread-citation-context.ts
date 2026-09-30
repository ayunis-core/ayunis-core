import type { UUID } from 'crypto';

export interface ThreadCitationContext {
  userId: UUID;
  workspaceId: UUID | null;
  sourceAssignments: {
    sourceId: UUID;
    originSkillId: UUID | null;
  }[];
  knowledgeBaseAssignments: {
    knowledgeBaseId: UUID;
    originSkillId: UUID | null;
  }[];
}
