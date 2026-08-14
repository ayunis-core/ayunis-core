import type { UUID } from 'crypto';
import type { Skill } from 'src/domain/skills/domain/skill.entity';
import type { Source } from 'src/domain/sources/domain/source.entity';
import type { KnowledgeBaseSummary } from 'src/domain/knowledge-bases/domain/knowledge-base-summary';

export interface WorkspaceKnowledgeBaseContext extends KnowledgeBaseSummary {
  description: string | null;
  documentCount: number;
}

export interface WorkspaceRunContext {
  instruction: string | null;
  skills: Skill[];
  knowledgeBases: WorkspaceKnowledgeBaseContext[];
  sources: Source[];
  runtimeKnowledgeBases: WorkspaceKnowledgeBaseContext[];
  runtimeSources: Source[];
  mcpIntegrationIds: UUID[];
}
